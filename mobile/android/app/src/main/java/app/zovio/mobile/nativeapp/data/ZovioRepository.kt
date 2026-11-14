package app.zovio.mobile.nativeapp.data

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import app.zovio.mobile.nativeapp.crypto.ZovioCrypto
import app.zovio.mobile.nativeapp.data.db.CallHistoryEntity
import app.zovio.mobile.nativeapp.data.db.ChannelEntity
import app.zovio.mobile.nativeapp.data.db.ChatEntity
import app.zovio.mobile.nativeapp.data.db.MessageEntity
import app.zovio.mobile.nativeapp.data.db.StatusEntity
import app.zovio.mobile.nativeapp.data.db.UserCacheEntity
import app.zovio.mobile.nativeapp.data.db.ZovioDatabase
import app.zovio.mobile.nativeapp.data.network.ApiException
import app.zovio.mobile.nativeapp.data.network.ZovioApiClient
import app.zovio.mobile.nativeapp.data.prefs.ZovioSessionStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.URLEncoder
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

sealed class NativeEvent {
    data class Toast(val message: String, val isError: Boolean = false) : NativeEvent()
    data class OpenWebMeet(val code: String) : NativeEvent()
}

class ZovioRepository(private val context: Context) {

    val db = ZovioDatabase.get(context)
    private val dao = db.dao()
    val sessionStore = ZovioSessionStore(context)
    val api = ZovioApiClient(
        baseUrlProvider = { sessionStore.baseHttpUrl },
        tokenProvider = { sessionStore.session.value.token }
    )

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val chatKeyCache = ConcurrentHashMap<String, ByteArray>()
    private val inflightMedia = ConcurrentHashMap<String, Boolean>()

    private val _typingByChat = MutableStateFlow<Map<String, String>>(emptyMap())
    val typingByChat: StateFlow<Map<String, String>> = _typingByChat.asStateFlow()

    private val _wsConnected = MutableStateFlow(false)
    val wsConnected: StateFlow<Boolean> = _wsConnected.asStateFlow()

    private val _events = MutableSharedFlow<NativeEvent>(extraBufferCapacity = 16)
    val events: SharedFlow<NativeEvent> = _events.asSharedFlow()

    private var webSocket: WebSocket? = null
    private var wsReconnectAttempt = 0
    private var shouldRunSocket = false

    val chatsFlow: Flow<List<ChatEntity>> = dao.observeChats()
    val usersFlow: Flow<List<UserCacheEntity>> = dao.observeUsers()
    val callHistoryFlow: Flow<List<CallHistoryEntity>> = dao.observeCallHistory()
    val statusesFlow: Flow<List<StatusEntity>> = dao.observeStatuses()
    val channelsFlow: Flow<List<ChannelEntity>> = dao.observeChannels()

    fun observeChat(chatId: String): Flow<ChatEntity?> = dao.observeChat(chatId)
    fun observeMessages(chatId: String): Flow<List<MessageEntity>> = dao.observeMessagesDesc(chatId)

    // -------------------- Authentication --------------------

    suspend fun loginWithPassword(emailOrUser: String, password: String): Result<Unit> =
        withContext(Dispatchers.IO) {
            runCatching {
                val q = URLEncoder.encode(emailOrUser.trim(), "UTF-8")
                val saltRes = api.getJsonObject("/api/auth/salt?email=$q", withAuth = false)
                if (!saltRes.optBoolean("exists", false)) {
                    throw ApiException(404, "No account found with this email or username.")
                }
                val kdfSalt = saltRes.getString("kdfSalt")
                val master = ZovioCrypto.deriveMaster(password, kdfSalt)
                val loginRes = api.postJson(
                    "/api/auth/login-email",
                    JSONObject()
                        .put("emailOrUser", emailOrUser.trim())
                        .put("authKey", master.authKeyHex),
                    withAuth = false
                )
                val token = loginRes.getString("token")
                val user = loginRes.getJSONObject("user")
                val privJwk = runCatching {
                    val wrapped = user.optJSONObject("wrappedPrivateKey")
                    if (wrapped != null) ZovioCrypto.unwrapPrivateKeyJwk(master.encKeyBytes, wrapped) else null
                }.getOrNull()
                val pubJwk = user.optString("publicKey", "")
                if (pubJwk.isNotBlank()) {
                    sessionStore.saveMyPublicKeyJwk(user.optString("id", ""), pubJwk)
                }
                sessionStore.saveLogin(token, user, privJwk)
                startRealtime()
                syncAllInitial()
            }
        }

    suspend fun sendRegisterOtp(email: String): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            api.postJson(
                "/api/auth/send-otp",
                JSONObject().put("email", email.trim()).put("purpose", "register"),
                withAuth = false
            )
            Unit
        }
    }

    suspend fun registerAccount(
        email: String,
        otp: String,
        username: String,
        name: String,
        password: String
    ): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val cleanEmail = email.trim().lowercase()
            val q = URLEncoder.encode(cleanEmail, "UTF-8")
            val saltRes = api.getJsonObject("/api/auth/salt?email=$q", withAuth = false)
            val kdfSalt = saltRes.getString("kdfSalt")
            val master = ZovioCrypto.deriveMaster(password, kdfSalt)
            val identity = ZovioCrypto.generateIdentity(master.encKeyBytes)
            val res = api.postJson(
                "/api/auth/register",
                JSONObject()
                    .put("email", cleanEmail)
                    .put("otp", otp.trim())
                    .put("username", username.trim().lowercase())
                    .put("name", name.trim())
                    .put("kdfSalt", kdfSalt)
                    .put("authKey", master.authKeyHex)
                    .put("publicKey", identity.publicKeyJwk)
                    .put("wrappedPrivateKey", identity.wrappedPrivateKey)
                    .put("wrappedVaultKey", identity.wrappedVaultKey),
                withAuth = false
            )
            val token = res.getString("token")
            val user = res.getJSONObject("user")
            sessionStore.saveMyPublicKeyJwk(user.optString("id", ""), identity.publicKeyJwk)
            sessionStore.saveLogin(token, user, identity.privJwkJson)
            startRealtime()
            syncAllInitial()
        }
    }

    suspend fun logout() {
        stopRealtime()
        chatKeyCache.clear()
        sessionStore.logout()
        withContext(Dispatchers.IO) {
            dao.clearAllChats()
            dao.clearAllMessages()
            dao.clearAllUsers()
            dao.clearCallHistory()
            dao.clearStatuses()
            dao.clearChannels()
        }
    }

    // -------------------- Sync & Socket --------------------

    fun startRealtime() {
        sessionStore.reload()
        if (!sessionStore.session.value.isLoggedIn) return
        shouldRunSocket = true
        if (webSocket == null) {
            connectSocket()
        }
    }

    fun stopRealtime() {
        shouldRunSocket = false
        try { webSocket?.close(1000, "logout") } catch (_: Exception) {}
        webSocket = null
        _wsConnected.value = false
    }

    private fun connectSocket() {
        if (!shouldRunSocket || !sessionStore.session.value.isLoggedIn) return
        val req = Request.Builder().url(sessionStore.wsUrl).build()
        webSocket = api.http.newWebSocket(req, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                wsReconnectAttempt = 0
                val tok = sessionStore.session.value.token
                if (tok.isNotBlank()) {
                    webSocket.send(JSONObject().put("type", "auth").put("token", tok).toString())
                }
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                scope.launch { handleSocketEvent(text) }
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                _wsConnected.value = false
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                this@ZovioRepository.webSocket = null
                _wsConnected.value = false
                scheduleReconnect()
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                this@ZovioRepository.webSocket = null
                _wsConnected.value = false
                scheduleReconnect()
            }
        })
    }

    private fun scheduleReconnect() {
        if (!shouldRunSocket || !sessionStore.session.value.isLoggedIn) return
        val delayMs = minOf(15_000L, 1200L * (1 shl minOf(wsReconnectAttempt, 4)))
        wsReconnectAttempt++
        scope.launch {
            delay(delayMs)
            if (shouldRunSocket && webSocket == null) connectSocket()
        }
    }

    private suspend fun handleSocketEvent(raw: String) {
        val ev = runCatching { JSONObject(raw) }.getOrNull() ?: return
        when (ev.optString("type")) {
            "auth:ok" -> {
                _wsConnected.value = true
                scope.launch { syncAllInitial() }
            }
            "msg:new", "msg:update" -> {
                val msgObj = ev.optJSONObject("message") ?: return
                val senderName = ev.optString("senderName", "")
                val chatId = msgObj.optString("chatId", "")
                if (chatId.isBlank()) return
                val chat = dao.getChat(chatId)
                val entity = decodeMessage(msgObj, chat, senderName)
                dao.upsertMessage(entity)
                updateChatLastPreviewFromMessage(chatId, entity)
                if (!entity.fileId.isNullOrBlank() && entity.kind == "image") {
                    ensureMediaCached(entity)
                }
            }
            "msg:delete-for-me" -> {
                val mid = ev.optString("messageId", "")
                if (mid.isNotBlank()) dao.deleteMessageById(mid)
            }
            "chat:upsert" -> {
                val c = ev.optJSONObject("chat") ?: return
                val entity = parseChat(c)
                dao.upsertChat(entity)
            }
            "chat:delete" -> {
                val cid = ev.optString("chatId", "")
                if (cid.isNotBlank()) {
                    dao.deleteChat(cid)
                    dao.clearChatMessages(cid)
                }
            }
            "presence" -> {
                val uid = ev.optString("userId", "")
                val on = ev.optBoolean("online", false)
                val ls = ev.optLong("lastSeen", System.currentTimeMillis())
                if (uid.isNotBlank()) {
                    dao.updateUserPresence(uid, on, ls)
                    dao.updatePeerPresence(uid, on, ls)
                }
            }
            "typing" -> {
                val cid = ev.optString("chatId", "")
                val name = ev.optString("name", "")
                val active = ev.optBoolean("active", false)
                if (cid.isNotBlank()) {
                    val next = _typingByChat.value.toMutableMap()
                    if (active && name.isNotBlank()) next[cid] = "$name is typing…"
                    else next.remove(cid)
                    _typingByChat.value = next
                }
            }
        }
    }

    suspend fun syncAllInitial() = withContext(Dispatchers.IO) {
        if (!sessionStore.session.value.isLoggedIn) return@withContext
        runCatching {
            val me = api.getJsonObject("/api/me")
            sessionStore.updateUser(me)
            me.optString("publicKey", "").takeIf { it.isNotBlank() }?.let {
                sessionStore.saveMyPublicKeyJwk(me.optString("id", ""), it)
            }
        }
        runCatching {
            val arr = api.getJsonArray("/api/users")
            val users = (0 until arr.length()).map { i -> parseUser(arr.getJSONObject(i)) }
            dao.upsertUsers(users)
        }
        syncChats()
        syncAuxiliaryTabs()
    }

    suspend fun syncChats() = withContext(Dispatchers.IO) {
        runCatching {
            val arr = api.getJsonArray("/api/chats")
            val parsed = (0 until arr.length()).map { i -> parseChat(arr.getJSONObject(i)) }
            dao.upsertChats(parsed)
        }
    }

    suspend fun syncMessages(chatId: String) = withContext(Dispatchers.IO) {
        runCatching {
            val chat = dao.getChat(chatId)
            val arr = api.getJsonArray("/api/chats/$chatId/messages?limit=150")
            val list = ArrayList<MessageEntity>(arr.length())
            for (i in 0 until arr.length()) {
                val msgObj = arr.getJSONObject(i)
                val ent = decodeMessage(msgObj, chat)
                list.add(ent)
            }
            dao.upsertMessages(list)
            list.lastOrNull()?.let { updateChatLastPreviewFromMessage(chatId, it) }
            // Prefetch latest 12 image thumbnails silently
            list.asReversed().filter { it.kind == "image" && !it.fileId.isNullOrBlank() }.take(12).forEach { m ->
                scope.launch { ensureMediaCached(m) }
            }
        }
    }

    suspend fun markChatRead(chatId: String) = withContext(Dispatchers.IO) {
        dao.clearUnread(chatId)
        runCatching { api.postJson("/api/chats/$chatId/read") }
    }

    suspend fun syncAuxiliaryTabs() = withContext(Dispatchers.IO) {
        runCatching {
            val callsArr = api.getJsonArray("/api/calls/history")
            val myUid = sessionStore.session.value.userId
            val calls = (0 until callsArr.length()).map { i ->
                val c = callsArr.getJSONObject(i)
                val callerId = c.optString("callerId", "")
                val direction = if (callerId == myUid) "outgoing" else "incoming"
                val peerName = c.optString("peerName", "").ifBlank {
                    c.optString("callerName", "").takeIf { callerId != myUid }
                        ?: c.optString("recipientName", "Voice/Video Call")
                }
                CallHistoryEntity(
                    id = c.optString("id", UUID.randomUUID().toString()),
                    callerId = callerId,
                    peerName = peerName,
                    peerAvatar = c.optString("peerAvatar", "").takeIf { it.isNotEmpty() && it != "null" },
                    mode = c.optString("mode", "audio"),
                    direction = direction,
                    status = c.optString("status", "completed"),
                    durationSec = c.optInt("duration", 0),
                    ts = c.optLong("ts", c.optLong("createdAt", 0L)),
                    chatId = c.optString("chatId", "").takeIf { it.isNotBlank() },
                    rawJson = c.toString()
                )
            }
            dao.clearCallHistory()
            dao.upsertCallHistory(calls)
        }
        runCatching {
            val stArr = api.getJsonArray("/api/statuses")
            val statuses = (0 until stArr.length()).map { i ->
                val s = stArr.getJSONObject(i)
                val userObj = s.optJSONObject("user")
                val viewedBy = s.optJSONArray("viewedBy")
                val myUid = sessionStore.session.value.userId
                var viewed = false
                if (viewedBy != null) {
                    for (j in 0 until viewedBy.length()) {
                        if (viewedBy.optString(j) == myUid) { viewed = true; break }
                    }
                }
                StatusEntity(
                    id = s.optString("id", ""),
                    userId = s.optString("userId", userObj?.optString("id") ?: ""),
                    userName = userObj?.optString("name", "") ?: s.optString("userName", "Contact"),
                    userAvatar = userObj?.optString("avatar", "")?.takeIf { it.isNotEmpty() && it != "null" },
                    kind = s.optString("kind", "text"),
                    text = s.optString("text", ""),
                    bgColor = s.optString("bgColor", "#7C5CFF"),
                    mediaUrl = s.optString("mediaUrl", "").takeIf { it.isNotEmpty() && it != "null" },
                    createdAt = s.optLong("createdAt", 0L),
                    expiresAt = s.optLong("expiresAt", 0L),
                    viewedByMe = viewed,
                    viewsCount = viewedBy?.length() ?: 0,
                    rawJson = s.toString()
                )
            }
            dao.clearStatuses()
            dao.upsertStatuses(statuses)
        }
        runCatching {
            val chArr = api.getJsonArray("/api/channels")
            val channels = (0 until chArr.length()).map { i ->
                val c = chArr.getJSONObject(i)
                ChannelEntity(
                    id = c.optString("id", ""),
                    name = c.optString("name", "Channel"),
                    handle = c.optString("handle", ""),
                    description = c.optString("description", ""),
                    avatar = c.optString("avatar", "").takeIf { it.isNotEmpty() && it != "null" },
                    avatarColor = c.optString("avatarColor", "#7C5CFF"),
                    followerCount = c.optInt("followerCount", 0),
                    isFollowing = c.optBoolean("isFollowing", false),
                    isAdmin = c.optBoolean("isAdmin", false),
                    updatedAt = c.optLong("updatedAt", 0L),
                    rawJson = c.toString()
                )
            }
            dao.clearChannels()
            dao.upsertChannels(channels)
        }
    }

    // -------------------- Message Sending & Actions --------------------

    fun sendTyping(chatId: String, active: Boolean) {
        val sock = webSocket ?: return
        val name = sessionStore.session.value.name.ifBlank { sessionStore.session.value.username }
        runCatching {
            sock.send(
                JSONObject()
                    .put("type", "typing")
                    .put("chatId", chatId)
                    .put("name", name)
                    .put("active", active)
                    .toString()
            )
        }
    }

    suspend fun sendTextMessage(chatId: String, text: String, replyToId: String? = null): Result<Unit> =
        withContext(Dispatchers.IO) {
            runCatching {
                val trimmed = text.trim()
                if (trimmed.isEmpty()) return@runCatching
                val chat = dao.getChat(chatId) ?: throw IllegalStateException("Chat not loaded")
                val payload = JSONObject().put("text", trimmed)
                sendPayload(chat, "text", payload, replyToId = replyToId)
            }
        }

    suspend fun sendUriAttachment(
        chatId: String,
        uri: Uri,
        caption: String = "",
        replyToId: String? = null
    ): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val chat = dao.getChat(chatId) ?: throw IllegalStateException("Chat not loaded")
            val cr = context.contentResolver
            val mime = cr.getType(uri) ?: "application/octet-stream"
            var displayName = "attachment"
            cr.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
                if (c.moveToFirst()) displayName = c.getString(0) ?: displayName
            }
            val bytes = cr.openInputStream(uri)?.use { it.readBytes() }
                ?: throw IllegalStateException("Unable to read selected file")
            val kind = when {
                mime.startsWith("image/") -> "image"
                mime.startsWith("video/") -> "video"
                mime.startsWith("audio/") -> "audio"
                else -> "file"
            }

            val chunkSize = 512 * 1024
            val chunks = maxOf(1, (bytes.size + chunkSize - 1) / chunkSize)
            val initRes = api.postJson(
                "/api/files",
                JSONObject()
                    .put("chatId", chatId)
                    .put("size", bytes.size)
                    .put("chunks", chunks)
                    .put("viewOnce", false)
            )
            val fileId = initRes.getString("id")
            val fileKeyRaw = ZovioCrypto.newKeyRaw()
            val fileKeyBytes = ZovioCrypto.unb64(fileKeyRaw)

            for (n in 0 until chunks) {
                val start = n * chunkSize
                val end = minOf(bytes.size, start + chunkSize)
                val slice = bytes.copyOfRange(start, end)
                val sealed = ZovioCrypto.encryptChunk(fileKeyBytes, slice)
                api.putBytes("/api/files/$fileId/$n", sealed)
            }
            api.postJson("/api/files/$fileId/complete")

            // Cache our own upload locally so it displays immediately
            val localFile = mediaCacheFile(fileId, displayName)
            localFile.writeBytes(bytes)

            val payload = JSONObject()
                .put("fileId", fileId)
                .put("fileKey", fileKeyRaw)
                .put("chunks", chunks)
                .put("mime", mime)
                .put("name", displayName)
                .put("size", bytes.size)
            if (caption.isNotBlank()) payload.put("caption", caption.trim())

            sendPayload(
                chat = chat,
                kind = kind,
                payload = payload,
                replyToId = replyToId,
                fileIds = listOf(fileId)
            )
        }
    }

    private suspend fun sendPayload(
        chat: ChatEntity,
        kind: String,
        payload: JSONObject,
        replyToId: String? = null,
        forwardedFrom: String? = null,
        fileIds: List<String> = emptyList()
    ) {
        val reqBody = JSONObject()
            .put("kind", kind)
            .put("clientNonce", UUID.randomUUID().toString().take(24))
        if (!replyToId.isNullOrBlank()) reqBody.put("replyTo", replyToId)
        if (!forwardedFrom.isNullOrBlank()) reqBody.put("forwardedFrom", forwardedFrom)
        if (fileIds.isNotEmpty()) reqBody.put("fileIds", JSONArray(fileIds))

        if (chat.type == "channel") {
            reqBody.put("body", payload)
        } else {
            val chatKey = getChatKeyBytes(chat)
                ?: throw IllegalStateException("Missing encryption key for this chat. Open once in Settings or re-login with password.")
            val box = ZovioCrypto.encryptJson(chatKey, payload)
            reqBody.put("iv", box.getString("iv"))
            reqBody.put("ct", box.getString("ct"))
            reqBody.put("keyVersion", maxOf(1, chat.keyVersion))
        }

        val sentObj = api.postJson("/api/chats/${chat.id}/messages", reqBody)
        val ent = decodeMessage(sentObj, chat)
        dao.upsertMessage(ent)
        updateChatLastPreviewFromMessage(chat.id, ent)
    }

    suspend fun toggleReaction(msgId: String, emoji: String) = withContext(Dispatchers.IO) {
        runCatching {
            val updated = api.postJson("/api/messages/$msgId/react", JSONObject().put("emoji", emoji))
            val cid = updated.optString("chatId", "")
            val chat = if (cid.isNotBlank()) dao.getChat(cid) else null
            dao.upsertMessage(decodeMessage(updated, chat))
        }
    }

    suspend fun editMessage(msgId: String, newText: String): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val cur = dao.getMessage(msgId) ?: throw IllegalStateException("Message not found")
            val chat = dao.getChat(cur.chatId) ?: throw IllegalStateException("Chat not found")
            val payload = JSONObject().put("text", newText.trim())
            val req = JSONObject()
            if (chat.type == "channel") {
                req.put("body", payload)
            } else {
                val chatKey = getChatKeyBytes(chat) ?: throw IllegalStateException("Missing chat key")
                val box = ZovioCrypto.encryptJson(chatKey, payload)
                req.put("iv", box.getString("iv"))
                req.put("ct", box.getString("ct"))
                req.put("keyVersion", maxOf(1, chat.keyVersion))
            }
            val updated = api.postJson("/api/messages/$msgId/edit", req)
            dao.upsertMessage(decodeMessage(updated, chat))
            Unit
        }
    }

    suspend fun deleteMessageForMe(msgId: String) = withContext(Dispatchers.IO) {
        runCatching {
            api.postJson("/api/messages/$msgId/delete-for-me")
            dao.deleteMessageById(msgId)
        }
    }

    suspend fun deleteMessageForEveryone(msgId: String) = withContext(Dispatchers.IO) {
        runCatching {
            val updated = api.postJson("/api/messages/$msgId/delete-for-everyone")
            val cid = updated.optString("chatId", "")
            val chat = if (cid.isNotBlank()) dao.getChat(cid) else null
            dao.upsertMessage(decodeMessage(updated, chat))
        }
    }

    suspend fun toggleStar(msgId: String) = withContext(Dispatchers.IO) {
        runCatching {
            val updated = api.postJson("/api/messages/$msgId/star")
            val cid = updated.optString("chatId", "")
            val chat = if (cid.isNotBlank()) dao.getChat(cid) else null
            dao.upsertMessage(decodeMessage(updated, chat))
        }
    }

    suspend fun forwardMessages(msgIds: List<String>, targetChatIds: List<String>): Result<Unit> =
        withContext(Dispatchers.IO) {
            runCatching {
                val msgs = msgIds.mapNotNull { dao.getMessage(it) }.sortedBy { it.ts }
                for (targetId in targetChatIds) {
                    val targetChat = dao.getChat(targetId) ?: continue
                    for (m in msgs) {
                        val p = runCatching { JSONObject(m.payloadJson) }.getOrNull() ?: JSONObject()
                        if (m.kind == "text") {
                            p.put("text", m.plainText)
                        }
                        val fIds = if (!m.fileId.isNullOrBlank()) listOf(m.fileId) else emptyList()
                        sendPayload(
                            chat = targetChat,
                            kind = m.kind,
                            payload = p,
                            forwardedFrom = m.senderId.ifBlank { sessionStore.session.value.userId },
                            fileIds = fIds
                        )
                    }
                }
            }
        }

    suspend fun startDirectChat(peer: UserCacheEntity): Result<String> = withContext(Dispatchers.IO) {
        runCatching {
            val myUid = sessionStore.session.value.userId
            val existing = dao.getMessagesAsc("") // noop check; scan chats via api/db
            val chatsArr = api.getJsonArray("/api/chats")
            for (i in 0 until chatsArr.length()) {
                val c = chatsArr.getJSONObject(i)
                if (c.optString("type") == "dm") {
                    val members = c.optJSONArray("members")
                    if (members != null) {
                        for (j in 0 until members.length()) {
                            if (members.optJSONObject(j)?.optString("id") == peer.id) {
                                dao.upsertChat(parseChat(c))
                                return@runCatching c.getString("id")
                            }
                        }
                    }
                }
            }
            val myPriv = sessionStore.getPrivateKeyJwk(myUid)
                ?: throw IllegalStateException("Unlock or sign in with password first to create a new encrypted DM.")
            val myPub = sessionStore.getMyPublicKeyJwk(myUid)
                ?: throw IllegalStateException("Missing your public key.")
            val peerPub = peer.publicKey
                ?: throw IllegalStateException("${peer.name} has not initialized encryption keys yet.")
            val rawKey = ZovioCrypto.newKeyRaw()
            val keysObj = JSONObject()
                .put(myUid, ZovioCrypto.wrapChatKey(rawKey, myPriv, myPub, myUid))
                .put(peer.id, ZovioCrypto.wrapChatKey(rawKey, myPriv, peerPub, myUid))

            val res = api.postJson(
                "/api/chats/dm",
                JSONObject().put("peerId", peer.id).put("keys", keysObj)
            )
            val entity = parseChat(res)
            sessionStore.saveChatKeyB64(entity.id, rawKey, 1, entity.name, false)
            chatKeyCache["${entity.id}_1"] = ZovioCrypto.unb64(rawKey)
            dao.upsertChat(entity)
            entity.id
        }
    }

    // -------------------- E2EE File Caching --------------------

    private fun mediaCacheFile(fileId: String, fileName: String?): File {
        val dir = File(context.filesDir, "media_cache")
        if (!dir.exists()) dir.mkdirs()
        val ext = fileName?.substringAfterLast('.', "")?.takeIf { it.length in 1..6 }
        val safeName = if (ext != null) "$fileId.$ext" else fileId
        return File(dir, safeName)
    }

    suspend fun ensureMediaCached(msg: MessageEntity): File? = withContext(Dispatchers.IO) {
        val fileId = msg.fileId ?: return@withContext null
        val fileKey = msg.fileKey ?: return@withContext null
        val existingPath = msg.localMediaPath
        if (!existingPath.isNullOrBlank()) {
            val f = File(existingPath)
            if (f.exists() && f.length() > 0L) return@withContext f
        }
        val candidate = mediaCacheFile(fileId, msg.fileName)
        if (candidate.exists() && candidate.length() > 0L) {
            dao.updateLocalMediaPath(msg.id, candidate.absolutePath)
            return@withContext candidate
        }
        if (inflightMedia.putIfAbsent(fileId, true) != null) return@withContext null
        try {
            val keyBytes = ZovioCrypto.unb64(fileKey)
            val chunks = maxOf(1, msg.fileChunks)
            val out = java.io.ByteArrayOutputStream()
            for (n in 0 until chunks) {
                val encChunk = api.getBytes("/api/files/$fileId/$n")
                out.write(ZovioCrypto.decryptChunk(keyBytes, encChunk))
            }
            candidate.writeBytes(out.toByteArray())
            dao.updateLocalMediaPath(msg.id, candidate.absolutePath)
            runCatching { api.postJson("/api/files/$fileId/cached") }
            candidate
        } catch (_: Exception) {
            null
        } finally {
            inflightMedia.remove(fileId)
        }
    }

    // -------------------- JSON Parsing & E2EE Decryption --------------------

    private fun parseUser(u: JSONObject): UserCacheEntity {
        return UserCacheEntity(
            id = u.optString("id", ""),
            username = u.optString("username", ""),
            name = u.optString("name", u.optString("username", "User")),
            bio = u.optString("bio", ""),
            avatar = u.optString("avatar", "").takeIf { it.isNotEmpty() && it != "null" },
            avatarColor = u.optString("avatarColor", "#7C5CFF"),
            online = u.optBoolean("online", false),
            lastSeen = u.optLong("lastSeen", 0L),
            publicKey = u.optString("publicKey", "").takeIf { it.isNotEmpty() && it != "null" },
            isFriend = u.optBoolean("isFriend", false),
            rawJson = u.toString()
        )
    }

    private suspend fun parseChat(c: JSONObject): ChatEntity {
        val myUid = sessionStore.session.value.userId
        val type = c.optString("type", "dm")
        val members = c.optJSONArray("members")
        var peerId = ""
        var peerName = ""
        var peerUser = ""
        var peerAvatar: String? = null
        var peerOnline = false
        var peerLastSeen = 0L
        var peerPub: String? = null
        var avatarColor = c.optString("avatarColor", "#7C5CFF")

        if (members != null) {
            val memberUsers = ArrayList<UserCacheEntity>()
            for (i in 0 until members.length()) {
                val m = members.optJSONObject(i) ?: continue
                memberUsers.add(parseUser(m))
                val mid = m.optString("id", "")
                if (type == "dm" && mid != myUid && mid.isNotBlank()) {
                    peerId = mid
                    peerName = m.optString("name", m.optString("username", ""))
                    peerUser = m.optString("username", "")
                    peerAvatar = m.optString("avatar", "").takeIf { it.isNotEmpty() && it != "null" }
                    peerOnline = m.optBoolean("online", false)
                    peerLastSeen = m.optLong("lastSeen", 0L)
                    peerPub = m.optString("publicKey", "").takeIf { it.isNotEmpty() && it != "null" }
                    avatarColor = m.optString("avatarColor", avatarColor)
                }
            }
            if (memberUsers.isNotEmpty()) dao.upsertUsers(memberUsers)
        }

        val displayName = when (type) {
            "dm" -> peerName.ifBlank { c.optString("name", "Direct Message") }
            "self" -> "Saved Messages"
            else -> c.optString("name", "Chat")
        }
        val displayAvatar = when (type) {
            "dm" -> peerAvatar ?: c.optString("avatar", "").takeIf { it.isNotEmpty() && it != "null" }
            else -> c.optString("avatar", "").takeIf { it.isNotEmpty() && it != "null" }
        }

        val chatId = c.getString("id")
        val keyVer = c.optInt("keyVersion", 1)
        val keysJson = c.optJSONObject("keys")?.toString() ?: "{}"
        val membersJson = members?.toString() ?: "[]"

        val prelimChat = ChatEntity(
            id = chatId,
            type = type,
            name = displayName,
            description = c.optString("description", ""),
            avatar = displayAvatar,
            avatarColor = avatarColor,
            ownerId = c.optString("ownerId", ""),
            isPinnedChat = c.optBoolean("isPinnedChat", false),
            isMuted = c.optBoolean("isMuted", false),
            isAccepted = c.optBoolean("isAccepted", true),
            unread = c.optInt("unread", 0),
            updatedAt = c.optLong("updatedAt", c.optLong("createdAt", 0L)),
            pinnedMessageId = c.optString("pinnedMessageId", "").takeIf { it.isNotEmpty() && it != "null" },
            keyVersion = keyVer,
            keysJson = keysJson,
            membersJson = membersJson,
            peerUserId = peerId,
            peerName = peerName,
            peerUsername = peerUser,
            peerAvatar = peerAvatar,
            peerOnline = peerOnline,
            peerLastSeen = peerLastSeen,
            peerPublicKey = peerPub,
            rawJson = c.toString()
        )

        val lastObj = c.optJSONObject("lastMessage")
        if (lastObj != null) {
            val decoded = decodeMessage(lastObj, prelimChat)
            return prelimChat.copy(
                lastMsgPreview = formatChatPreview(decoded),
                lastMsgSender = decoded.senderName,
                lastMsgTs = decoded.ts,
                lastMsgKind = decoded.kind,
                lastMsgFromMe = decoded.senderId == myUid
            )
        }
        return prelimChat
    }

    private suspend fun getChatKeyBytes(chat: ChatEntity): ByteArray? {
        val ver = maxOf(1, chat.keyVersion)
        val cacheKey = "${chat.id}_$ver"
        chatKeyCache[cacheKey]?.let { return it }

        sessionStore.getCachedChatKeyB64(chat.id, ver)?.let { b64 ->
            val bytes = ZovioCrypto.unb64(b64)
            chatKeyCache[cacheKey] = bytes
            return bytes
        }

        val myUid = sessionStore.session.value.userId
        val myPrivJwk = sessionStore.getPrivateKeyJwk(myUid) ?: return null
        val keysRoot = runCatching { JSONObject(chat.keysJson) }.getOrNull() ?: return null
        val box = keysRoot.optJSONObject(ver.toString())
            ?: keysRoot.optJSONObject("1")
            ?: return null
        val wrapperId = box.optString("wrapperId", "")
        if (wrapperId.isBlank()) return null

        val wrapperPub = findPublicKeyForUser(wrapperId, chat) ?: return null
        return runCatching {
            val rawB64 = ZovioCrypto.unwrapChatKey(box, myPrivJwk, wrapperPub)
            sessionStore.saveChatKeyB64(
                chat.id,
                rawB64,
                ver,
                chat.name,
                chat.type == "group"
            )
            ZovioCrypto.unb64(rawB64).also { chatKeyCache[cacheKey] = it }
        }.getOrNull()
    }

    private suspend fun findPublicKeyForUser(uid: String, chat: ChatEntity): String? {
        if (uid == sessionStore.session.value.userId) {
            sessionStore.getMyPublicKeyJwk(uid)?.let { return it }
        }
        val members = runCatching { JSONArray(chat.membersJson) }.getOrNull()
        if (members != null) {
            for (i in 0 until members.length()) {
                val m = members.optJSONObject(i) ?: continue
                if (m.optString("id") == uid) {
                    val pk = m.optString("publicKey", "")
                    if (pk.isNotBlank() && pk != "null") return pk
                }
            }
        }
        return dao.getUser(uid)?.publicKey
    }

    private suspend fun decodeMessage(
        m: JSONObject,
        chat: ChatEntity?,
        senderNameHint: String = ""
    ): MessageEntity {
        val id = m.optString("id", "")
        val chatId = m.optString("chatId", chat?.id ?: "")
        val senderId = m.optString("senderId", "")
        val kind = m.optString("kind", "text")
        val ts = m.optLong("ts", System.currentTimeMillis())
        val isDeleted = m.optBoolean("deletedForEveryone", false) || m.optBoolean("deleted", false)

        val resolvedSender = when {
            senderNameHint.isNotBlank() -> senderNameHint
            senderId == "system" -> "System"
            senderId == sessionStore.session.value.userId -> "You"
            else -> dao.getUser(senderId)?.name?.takeIf { it.isNotBlank() } ?: "Member"
        }

        var payload = JSONObject()
        var plainText = ""
        if (!isDeleted) {
            val iv = m.optString("iv", "")
            val ct = m.optString("ct", "")
            val bodyObj = m.optJSONObject("body")
            val bodyStr = if (bodyObj == null) m.optString("body", "") else ""

            if (iv.isNotBlank() && ct.isNotBlank() && chat != null) {
                val ver = m.optInt("keyVersion", chat.keyVersion).coerceAtLeast(1)
                val keyBytes = getChatKeyBytes(chat.copy(keyVersion = ver))
                if (keyBytes != null) {
                    runCatching {
                        payload = ZovioCrypto.decryptJson(
                            keyBytes,
                            JSONObject().put("iv", iv).put("ct", ct)
                        )
                    }.onFailure {
                        plainText = "🔒 Unable to decrypt"
                    }
                } else {
                    plainText = "🔒 Encrypted message"
                }
            } else if (bodyObj != null) {
                payload = bodyObj
            } else if (bodyStr.isNotBlank() && bodyStr != "null") {
                payload = JSONObject().put("text", bodyStr)
            }
        }

        val fileId = payload.optString("fileId", "").takeIf { it.isNotBlank() }
            ?: m.optJSONArray("fileIds")?.optString(0)?.takeIf { it.isNotBlank() }
        val fileKey = payload.optString("fileKey", "").takeIf { it.isNotBlank() }
        val fileChunks = payload.optInt("chunks", 1)
        val fileName = payload.optString("name", payload.optString("title", "")).takeIf { it.isNotBlank() }
        val mimeType = payload.optString("mime", "").takeIf { it.isNotBlank() }
        val fileSize = payload.optLong("size", 0L)
        val mediaUrl = payload.optString("url", "").takeIf { it.isNotBlank() }

        if (plainText.isBlank()) {
            plainText = when {
                isDeleted -> "This message was deleted"
                kind == "text" || kind == "system" -> payload.optString("text", "")
                kind == "image" -> payload.optString("caption", "")
                kind == "video" -> payload.optString("caption", "")
                kind == "audio" -> "Voice note"
                kind == "file" -> fileName ?: "File"
                kind == "call" -> {
                    val mode = payload.optString("mode", "audio")
                    if (mode == "video") "Video call" else "Voice call"
                }
                kind == "location" || kind == "live" -> payload.optString("label", "Shared location").ifBlank { "Location" }
                kind == "poll" -> payload.optString("question", "Poll")
                kind == "todo" -> payload.optString("title", "Checklist")
                kind == "gif" -> "GIF"
                kind == "sticker" -> "Sticker"
                else -> payload.optString("text", "")
            }
        }

        val replyToId = m.optString("replyTo", "").takeIf { it.isNotBlank() && it != "null" }
        var replySender: String? = null
        var replyPreview: String? = null
        if (replyToId != null) {
            dao.getMessage(replyToId)?.let { rm ->
                replySender = rm.senderName
                replyPreview = formatChatPreview(rm)
            }
        }

        val myUid = sessionStore.session.value.userId
        val starredArr = m.optJSONArray("starredBy")
        var starredByMe = false
        if (starredArr != null) {
            for (i in 0 until starredArr.length()) {
                if (starredArr.optString(i) == myUid) { starredByMe = true; break }
            }
        }

        val existing = dao.getMessage(id)
        return MessageEntity(
            id = id,
            chatId = chatId,
            senderId = senderId,
            senderName = resolvedSender,
            ts = ts,
            kind = kind,
            plainText = plainText,
            payloadJson = payload.toString(),
            mediaUrl = mediaUrl,
            localMediaPath = existing?.localMediaPath,
            fileId = fileId,
            fileKey = fileKey,
            fileChunks = fileChunks,
            fileName = fileName,
            mimeType = mimeType,
            fileSize = fileSize,
            replyToId = replyToId,
            replySender = replySender,
            replyPreview = replyPreview,
            reactionsJson = m.optJSONObject("reactions")?.toString() ?: "{}",
            readByJson = m.optJSONArray("readBy")?.toString() ?: "[]",
            editedAt = m.optLong("editedAt", 0L),
            starredByMe = starredByMe,
            isDeleted = isDeleted,
            forwardedFrom = m.optString("forwardedFrom", "").takeIf { it.isNotBlank() && it != "null" },
            viewOnce = m.optBoolean("viewOnce", false),
            localStatus = "sent",
            rawJson = m.toString()
        )
    }

    private suspend fun updateChatLastPreviewFromMessage(chatId: String, m: MessageEntity) {
        val chat = dao.getChat(chatId) ?: return
        if (m.ts < chat.lastMsgTs) return
        val myUid = sessionStore.session.value.userId
        dao.upsertChat(
            chat.copy(
                updatedAt = maxOf(chat.updatedAt, m.ts),
                lastMsgPreview = formatChatPreview(m),
                lastMsgSender = m.senderName,
                lastMsgTs = m.ts,
                lastMsgKind = m.kind,
                lastMsgFromMe = m.senderId == myUid
            )
        )
    }

    fun formatChatPreview(m: MessageEntity): String {
        if (m.isDeleted) return "This message was deleted"
        return when (m.kind) {
            "image" -> if (m.plainText.isNotBlank()) "📷 ${m.plainText}" else "📷 Photo"
            "video" -> if (m.plainText.isNotBlank()) "🎥 ${m.plainText}" else "🎥 Video"
            "audio" -> "🎤 Voice message"
            "file" -> "📄 ${m.fileName ?: "Document"}"
            "call" -> "📞 ${m.plainText}"
            "location", "live" -> "📍 ${m.plainText.ifBlank { "Location" }}"
            "poll" -> "📊 ${m.plainText}"
            "todo" -> "✅ ${m.plainText}"
            "gif" -> "GIF"
            "sticker" -> "Sticker"
            else -> m.plainText.ifBlank { "Message" }
        }
    }
}
