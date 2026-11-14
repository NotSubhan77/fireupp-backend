package app.zovio.mobile

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Base64
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.Person
import androidx.core.app.RemoteInput
import androidx.core.content.ContextCompat
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.security.SecureRandom
import java.util.concurrent.TimeUnit
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

class ZovioBgSyncService : Service() {

    companion object {
        const val PREFS_NAME = "zovio_bg_prefs"
        const val KEYS_PREFS_NAME = "zovio_bg_keys"
        const val KEY_TOKEN = "token"
        const val KEY_USER_ID = "userId"
        const val KEY_DEVICE_ID = "deviceId"
        const val KEY_DEVICE_LABEL = "deviceLabel"
        const val KEY_NOTIFY_ENABLED = "notifyEnabled"
        const val KEY_NOTIFY_CALLS = "notifyCalls"
        const val KEY_NOTIFY_DMS = "notifyDms"
        const val KEY_NOTIFY_GROUPS = "notifyGroups"
        const val KEY_NOTIFY_PREVIEW = "notifyPreview"
        const val KEY_WS_URL = "wsUrl"

        const val DEFAULT_WS_URL = "wss://fireupp.up.railway.app"
        const val CHANNEL_BG_SYNC = "zovio_bg_sync_v1"
        const val CHANNEL_CALL_RING = "zovio_calls_ring_v3"
        const val CHANNEL_ALERTS = "zovio_alerts_v2"
        const val CHANNEL_SILENT = "zovio_alerts_silent_v2"
        const val BG_NOTIFICATION_ID = 4101
        const val SUMMARY_NOTIFICATION_ID = 4200
        const val GROUP_KEY_MESSAGES = "app.zovio.mobile.MSG_GROUP"

        const val ACTION_START = "app.zovio.mobile.BG_START"
        const val ACTION_STOP = "app.zovio.mobile.BG_STOP"

        private data class MsgEntry(
            val sender: String,
            val text: String,
            val ts: Long,
            val isSelf: Boolean = false
        )

        private data class ChatMeta(
            val chatId: String,
            val title: String,
            val isGroup: Boolean
        )

        private val stackLock = Any()
        private val messageStacks = linkedMapOf<String, MutableList<MsgEntry>>()
        private val chatMetaMap = hashMapOf<String, ChatMeta>()

        @Volatile
        var isAppInForeground: Boolean = false

        fun startOrRefresh(context: Context) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val token = prefs.getString(KEY_TOKEN, "") ?: ""
            if (token.isEmpty()) return
            val intent = Intent(context, ZovioBgSyncService::class.java).apply {
                action = ACTION_START
            }
            try {
                ContextCompat.startForegroundService(context, intent)
            } catch (_: Exception) {
                try {
                    context.startService(intent)
                } catch (_: Exception) {}
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, ZovioBgSyncService::class.java).apply {
                action = ACTION_STOP
            }
            try {
                context.startService(intent)
            } catch (_: Exception) {}
        }

        fun isDndOrMuted(context: Context): Boolean {
            return try {
                val nm = context.getSystemService(NotificationManager::class.java)
                val dndActive = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && nm != null) {
                    val f = nm.currentInterruptionFilter
                    f != NotificationManager.INTERRUPTION_FILTER_ALL &&
                        f != NotificationManager.INTERRUPTION_FILTER_UNKNOWN
                } else false

                val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
                val ringerMuted = am != null && am.ringerMode != AudioManager.RINGER_MODE_NORMAL
                dndActive || ringerMuted
            } catch (_: Exception) {
                false
            }
        }

        fun saveChatKey(
            context: Context,
            chatId: String,
            keyB64: String,
            keyVersion: Int = 1,
            chatTitle: String = "",
            isGroup: Boolean = false
        ) {
            if (chatId.isEmpty() || keyB64.isEmpty()) return
            val prefs = context.getSharedPreferences(KEYS_PREFS_NAME, Context.MODE_PRIVATE)
            val ed = prefs.edit()
                .putString("key_$chatId", keyB64)
                .putInt("kv_$chatId", keyVersion.coerceAtLeast(1))
                .putBoolean("grp_$chatId", isGroup)
            if (chatTitle.isNotEmpty()) ed.putString("title_$chatId", chatTitle)
            ed.apply()
        }

        fun decryptPayload(context: Context, chatId: String, ivB64: String, ctB64: String): JSONObject? {
            if (chatId.isEmpty() || ivB64.isEmpty() || ctB64.isEmpty()) return null
            return try {
                val prefs = context.getSharedPreferences(KEYS_PREFS_NAME, Context.MODE_PRIVATE)
                val keyB64 = prefs.getString("key_$chatId", null) ?: return null
                val keyBytes = Base64.decode(keyB64, Base64.DEFAULT)
                val ivBytes = Base64.decode(ivB64, Base64.DEFAULT)
                val ctBytes = Base64.decode(ctB64, Base64.DEFAULT)
                val cipher = Cipher.getInstance("AES/GCM/NoPadding")
                cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(keyBytes, "AES"), GCMParameterSpec(128, ivBytes))
                val plain = cipher.doFinal(ctBytes)
                JSONObject(String(plain, Charsets.UTF_8))
            } catch (_: Exception) {
                null
            }
        }

        fun encryptTextPayload(context: Context, chatId: String, text: String): Triple<String, String, Int>? {
            if (chatId.isEmpty() || text.isEmpty()) return null
            return try {
                val prefs = context.getSharedPreferences(KEYS_PREFS_NAME, Context.MODE_PRIVATE)
                val keyB64 = prefs.getString("key_$chatId", null) ?: return null
                val keyVersion = prefs.getInt("kv_$chatId", 1).coerceAtLeast(1)
                val keyBytes = Base64.decode(keyB64, Base64.DEFAULT)
                val iv = ByteArray(12)
                SecureRandom().nextBytes(iv)
                val payload = JSONObject().put("text", text).toString().toByteArray(Charsets.UTF_8)
                val cipher = Cipher.getInstance("AES/GCM/NoPadding")
                cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(keyBytes, "AES"), GCMParameterSpec(128, iv))
                val ct = cipher.doFinal(payload)
                Triple(
                    Base64.encodeToString(iv, Base64.NO_WRAP),
                    Base64.encodeToString(ct, Base64.NO_WRAP),
                    keyVersion
                )
            } catch (_: Exception) {
                null
            }
        }

        fun cancelNotificationByTag(context: Context, tag: String) {
            if (tag.isEmpty()) return
            synchronized(stackLock) {
                messageStacks.remove(tag)
                chatMetaMap.remove(tag)
            }
            val reqCode = (tag.hashCode() and 0x7fffffff).coerceAtLeast(1)
            try {
                NotificationManagerCompat.from(context).cancel(tag, reqCode)
                updateGroupSummaryNotification(context)
            } catch (_: Exception) {}
        }

        fun appendOwnReplyToNotification(
            context: Context,
            tag: String,
            chatId: String,
            title: String,
            replyText: String,
            isGroup: Boolean
        ) {
            if (tag.isEmpty()) return
            val now = System.currentTimeMillis()
            synchronized(stackLock) {
                val list = messageStacks.getOrPut(tag) { mutableListOf() }
                list.add(MsgEntry(sender = "You", text = replyText, ts = now, isSelf = true))
                while (list.size > 12) list.removeAt(0)
                if (!chatMetaMap.containsKey(tag)) {
                    chatMetaMap[tag] = ChatMeta(chatId = chatId, title = title, isGroup = isGroup)
                }
            }
            postStackedChatNotification(context, tag, silent = true, onlyAlertOnce = true)
        }

        fun refreshChatNotificationSilent(context: Context, tag: String) {
            if (tag.isEmpty()) return
            postStackedChatNotification(context, tag, silent = true, onlyAlertOnce = true)
        }

        private fun updateGroupSummaryNotification(context: Context) {
            val nm = NotificationManagerCompat.from(context)
            val snapshot: List<Pair<String, List<MsgEntry>>>
            val metas: Map<String, ChatMeta>
            synchronized(stackLock) {
                if (messageStacks.isEmpty()) {
                    try { nm.cancel(SUMMARY_NOTIFICATION_ID) } catch (_: Exception) {}
                    return
                }
                snapshot = messageStacks.entries.map { it.key to it.value.toList() }
                metas = HashMap(chatMetaMap)
            }

            val totalMsgs = snapshot.sumOf { pair -> pair.second.count { !it.isSelf } }.coerceAtLeast(
                snapshot.sumOf { it.second.size }
            )
            val chatCount = snapshot.size
            if (totalMsgs <= 1 && chatCount <= 1) {
                try { nm.cancel(SUMMARY_NOTIFICATION_ID) } catch (_: Exception) {}
                return
            }

            val piFlags = PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
            val tapIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
            }
            val tapPi = PendingIntent.getActivity(context, SUMMARY_NOTIFICATION_ID, tapIntent, piFlags)

            val inbox = NotificationCompat.InboxStyle()
                .setBigContentTitle("$totalMsgs messages from $chatCount ${if (chatCount == 1) "chat" else "chats"}")
            for ((tag, entries) in snapshot.takeLast(6)) {
                val meta = metas[tag]
                val last = entries.lastOrNull() ?: continue
                val linePrefix = if (meta?.title?.isNotEmpty() == true) "${meta.title}: " else "${last.sender}: "
                inbox.addLine("$linePrefix${last.text}")
            }

            val summary = NotificationCompat.Builder(context, CHANNEL_ALERTS)
                .setSmallIcon(R.drawable.ic_stat_zovio)
                .setContentTitle("Zovio")
                .setContentText("$totalMsgs new messages across $chatCount chats")
                .setStyle(inbox)
                .setNumber(totalMsgs)
                .setGroup(GROUP_KEY_MESSAGES)
                .setGroupSummary(true)
                .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_CHILDREN)
                .setAutoCancel(true)
                .setContentIntent(tapPi)
                .build()

            try {
                nm.notify(SUMMARY_NOTIFICATION_ID, summary)
            } catch (_: Exception) {}
        }

        private fun postStackedChatNotification(
            context: Context,
            tag: String,
            silent: Boolean,
            onlyAlertOnce: Boolean
        ): Boolean {
            val entries: List<MsgEntry>
            val meta: ChatMeta?
            synchronized(stackLock) {
                entries = messageStacks[tag]?.toList() ?: return false
                meta = chatMetaMap[tag]
            }
            val chatId = meta?.chatId ?: ""
            val title = meta?.title?.ifEmpty { "Zovio" } ?: "Zovio"
            val isGroup = meta?.isGroup ?: false
            val effectiveSilent = silent || isDndOrMuted(context)
            val channelId = if (effectiveSilent) CHANNEL_SILENT else CHANNEL_ALERTS

            val reqCode = (tag.hashCode() and 0x7fffffff).coerceAtLeast(1)
            val tapIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
                if (chatId.isNotEmpty()) putExtra("chatId", chatId)
            }
            val piImmutableFlags = PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
            val pendingIntent = PendingIntent.getActivity(context, reqCode, tapIntent, piImmutableFlags)

            val mePerson = Person.Builder().setName("You").build()
            val messagingStyle = NotificationCompat.MessagingStyle(mePerson)
            if (isGroup) {
                messagingStyle.setGroupConversation(true).setConversationTitle(title)
            } else {
                messagingStyle.setGroupConversation(false)
            }
            for (e in entries) {
                val person = if (e.isSelf) mePerson else Person.Builder().setName(e.sender.ifEmpty { title }).build()
                messagingStyle.addMessage(e.text, e.ts, person)
            }

            val lastText = entries.lastOrNull()?.text ?: ""
            val builder = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.drawable.ic_stat_zovio)
                .setContentTitle(title)
                .setContentText(lastText)
                .setStyle(messagingStyle)
                .setGroup(GROUP_KEY_MESSAGES)
                .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_CHILDREN)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setPriority(if (effectiveSilent) NotificationCompat.PRIORITY_LOW else NotificationCompat.PRIORITY_HIGH)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOnlyAlertOnce(onlyAlertOnce)
                .setSilent(effectiveSilent)

            if (chatId.isNotEmpty()) {
                val piMutableFlags = PendingIntent.FLAG_UPDATE_CURRENT or
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0

                val replyIntent = Intent(context, ZovioNotificationReceiver::class.java).apply {
                    action = ZovioNotificationReceiver.ACTION_INLINE_REPLY
                    putExtra(ZovioNotificationReceiver.EXTRA_CHAT_ID, chatId)
                    putExtra(ZovioNotificationReceiver.EXTRA_TAG, tag)
                    putExtra(ZovioNotificationReceiver.EXTRA_TITLE, title)
                    putExtra(ZovioNotificationReceiver.EXTRA_IS_GROUP, isGroup)
                }
                val replyPi = PendingIntent.getBroadcast(context, reqCode + 10000, replyIntent, piMutableFlags)
                val remoteInput = RemoteInput.Builder(ZovioNotificationReceiver.KEY_REMOTE_INPUT_REPLY)
                    .setLabel("Reply...")
                    .build()
                val replyAction = NotificationCompat.Action.Builder(
                    R.drawable.ic_stat_zovio,
                    "Reply",
                    replyPi
                )
                    .addRemoteInput(remoteInput)
                    .setAllowGeneratedReplies(true)
                    .build()
                builder.addAction(replyAction)

                val readIntent = Intent(context, ZovioNotificationReceiver::class.java).apply {
                    action = ZovioNotificationReceiver.ACTION_MARK_READ
                    putExtra(ZovioNotificationReceiver.EXTRA_CHAT_ID, chatId)
                    putExtra(ZovioNotificationReceiver.EXTRA_TAG, tag)
                }
                val readPi = PendingIntent.getBroadcast(context, reqCode + 20000, readIntent, piImmutableFlags)
                builder.addAction(R.drawable.ic_stat_zovio, "Mark read", readPi)
            }

            return try {
                NotificationManagerCompat.from(context).notify(tag, reqCode, builder.build())
                updateGroupSummaryNotification(context)
                true
            } catch (_: Exception) {
                false
            }
        }

        fun showSystemNotification(
            context: Context,
            title: String,
            body: String,
            chatId: String = "",
            tag: String = "zovio",
            category: String = "",
            silent: Boolean = false,
            incomingCallJson: String = "",
            senderName: String = "",
            chatName: String = "",
            isGroup: Boolean = false
        ): Boolean {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            ) {
                return false
            }

            ensureChannels(context)
            val isCall = category == "call"
            val effectiveSilent = silent || isDndOrMuted(context)
            if (!isCall) {
                val convTitle = if (isGroup && chatName.isNotEmpty()) chatName else title
                val entrySender = if (senderName.isNotEmpty()) senderName else title
                val now = System.currentTimeMillis()
                synchronized(stackLock) {
                    val list = messageStacks.getOrPut(tag) { mutableListOf() }
                    list.add(MsgEntry(sender = entrySender, text = body, ts = now, isSelf = false))
                    while (list.size > 12) list.removeAt(0)
                    chatMetaMap[tag] = ChatMeta(chatId = chatId, title = convTitle, isGroup = isGroup)
                }
                return postStackedChatNotification(
                    context = context,
                    tag = tag,
                    silent = effectiveSilent,
                    onlyAlertOnce = false
                )
            }

            val channelId = if (!effectiveSilent) CHANNEL_CALL_RING else CHANNEL_SILENT
            val reqCode = (tag.hashCode() and 0x7fffffff).coerceAtLeast(1)
            val tapIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
                if (chatId.isNotEmpty()) putExtra("chatId", chatId)
                if (incomingCallJson.isNotEmpty()) putExtra("incomingCallJson", incomingCallJson)
            }
            val piFlags = PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
            val pendingIntent = PendingIntent.getActivity(context, reqCode, tapIntent, piFlags)

            val builder = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.drawable.ic_stat_zovio)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setPriority(if (effectiveSilent) NotificationCompat.PRIORITY_LOW else NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setSilent(effectiveSilent)
                .setFullScreenIntent(pendingIntent, true)
                .setTimeoutAfter(42_000L)

            return try {
                NotificationManagerCompat.from(context).notify(tag, reqCode, builder.build())
                true
            } catch (_: Exception) {
                false
            }
        }

        fun ensureChannels(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            val nm = context.getSystemService(NotificationManager::class.java) ?: return

            if (nm.getNotificationChannel(CHANNEL_BG_SYNC) == null) {
                val bgCh = NotificationChannel(
                    CHANNEL_BG_SYNC,
                    "Background Connection",
                    NotificationManager.IMPORTANCE_MIN
                ).apply {
                    description = "Keeps Zovio ready for incoming calls & encrypted messages"
                    setShowBadge(false)
                    setSound(null, null)
                    enableVibration(false)
                }
                nm.createNotificationChannel(bgCh)
            }

            if (nm.getNotificationChannel(CHANNEL_ALERTS) == null) {
                val alertCh = NotificationChannel(
                    CHANNEL_ALERTS,
                    "Messages & Activity",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Zovio encrypted messages and activity alerts"
                    enableVibration(true)
                }
                nm.createNotificationChannel(alertCh)
            }

            if (nm.getNotificationChannel(CHANNEL_SILENT) == null) {
                val silentCh = NotificationChannel(
                    CHANNEL_SILENT,
                    "Silent Messages",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "Silent encrypted message alerts"
                    enableVibration(false)
                    setSound(null, null)
                }
                nm.createNotificationChannel(silentCh)
            }

            if (nm.getNotificationChannel(CHANNEL_CALL_RING) == null) {
                val ringUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val attrs = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
                val callCh = NotificationChannel(
                    CHANNEL_CALL_RING,
                    "Incoming Calls",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Incoming voice and video call ring alerts"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0L, 650L, 450L, 650L, 450L)
                    if (ringUri != null) setSound(ringUri, attrs)
                }
                nm.createNotificationChannel(callCh)
            }
        }
    }

    private val handler = Handler(Looper.getMainLooper())
    private val client by lazy {
        OkHttpClient.Builder()
            .pingInterval(22, TimeUnit.SECONDS)
            .connectTimeout(12, TimeUnit.SECONDS)
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .build()
    }

    private var ws: WebSocket? = null
    private var reconnectAttempts = 0
    private var isStopped = false

    private val reconnectRunnable = Runnable {
        if (!isStopped) connectSocket()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        ensureChannels(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            isStopped = true
            closeSocket()
            try {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } catch (_: Exception) {}
            stopSelf()
            return START_NOT_STICKY
        }

        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val token = prefs.getString(KEY_TOKEN, "") ?: ""
        if (token.isEmpty()) {
            stopSelf()
            return START_NOT_STICKY
        }

        isStopped = false
        promoteForeground()
        connectSocket()
        return START_STICKY
    }

    private fun promoteForeground() {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pi = PendingIntent.getActivity(
            this,
            901,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notif: Notification = NotificationCompat.Builder(this, CHANNEL_BG_SYNC)
            .setSmallIcon(R.drawable.ic_stat_zovio)
            .setContentTitle("Zovio")
            .setContentText("Connected for calls & encrypted messages")
            .setContentIntent(pi)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setSilent(true)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(BG_NOTIFICATION_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(BG_NOTIFICATION_ID, notif)
        }
    }

    private fun connectSocket() {
        handler.removeCallbacks(reconnectRunnable)
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val token = prefs.getString(KEY_TOKEN, "") ?: ""
        if (token.isEmpty() || isStopped) return

        if (ws != null) return

        val wsUrl = prefs.getString(KEY_WS_URL, DEFAULT_WS_URL) ?: DEFAULT_WS_URL
        val req = Request.Builder().url(wsUrl).build()

        ws = client.newWebSocket(req, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                reconnectAttempts = 0
                val auth = JSONObject().apply {
                    put("type", "auth")
                    put("token", token)
                    put("active", false)
                    put("bgListener", true)
                    put("deviceRole", "phone")
                    put("deviceId", (prefs.getString(KEY_DEVICE_ID, "") ?: "") + ":bg")
                    put("deviceLabel", prefs.getString(KEY_DEVICE_LABEL, "Android Phone") ?: "Android Phone")
                }
                webSocket.send(auth.toString())
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val obj = JSONObject(text)
                    val type = obj.optString("type", "")
                    when (type) {
                        "call:incoming" -> handleIncomingCallWs(webSocket, obj)
                        "call:ended", "call:answered-elsewhere", "call:accepted", "call:declined" -> {
                            val callTag = "call-${obj.optString("callId", obj.optString("code", ""))}"
                            cancelNotificationByTag(this@ZovioBgSyncService, callTag)
                            cancelNotificationByTag(this@ZovioBgSyncService, "call-incoming")
                        }
                        "msg:new" -> handleIncomingMessageWs(obj)
                    }
                } catch (_: Exception) {}
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                webSocket.close(1000, null)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                if (ws === webSocket) ws = null
                scheduleReconnect()
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                if (ws === webSocket) ws = null
                scheduleReconnect()
            }
        })
    }

    private fun scheduleReconnect() {
        if (isStopped) return
        val delayMs = (3000L * (1 shl reconnectAttempts.coerceAtMost(3))).coerceAtMost(20_000L)
        reconnectAttempts++
        handler.removeCallbacks(reconnectRunnable)
        handler.postDelayed(reconnectRunnable, delayMs)
    }

    private fun closeSocket() {
        handler.removeCallbacks(reconnectRunnable)
        try { ws?.close(1000, "Stopped") } catch (_: Exception) {}
        ws = null
    }

    private fun handleIncomingCallWs(socket: WebSocket, msg: JSONObject) {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val notifyEnabled = prefs.getBoolean(KEY_NOTIFY_ENABLED, true)
        val notifyCalls = prefs.getBoolean(KEY_NOTIFY_CALLS, true)

        // Acknowledge receipt back to server so caller transitions Calling... -> Ringing...
        val ack = JSONObject().apply {
            put("type", "call:ringing")
            put("chatId", msg.optString("chatId", ""))
            put("code", msg.optString("code", ""))
            put("callId", msg.optString("callId", ""))
            put("callerId", msg.optString("callerId", ""))
        }
        socket.send(ack.toString())

        if (!notifyEnabled || !notifyCalls) return
        if (isAppInForeground) return

        val callerName = msg.optString("callerName", "Zovio Contact")
        val mode = msg.optString("mode", "audio")
        val chatId = msg.optString("chatId", "")
        val callKey = msg.optString("callId", msg.optString("code", ""))
        val tag = if (callKey.isNotEmpty()) "call-$callKey" else "call-incoming"
        val body = if (mode == "video") "Incoming Video Call — Tap to answer" else "Incoming Voice Call — Tap to answer"

        showSystemNotification(
            context = this,
            title = callerName,
            body = body,
            chatId = chatId,
            tag = tag,
            category = "call",
            silent = false,
            incomingCallJson = msg.toString()
        )
    }

    private fun handleIncomingMessageWs(envelope: JSONObject) {
        if (isAppInForeground) return
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(KEY_NOTIFY_ENABLED, true)) return

        val m = envelope.optJSONObject("message") ?: return
        val myUid = prefs.getString(KEY_USER_ID, "") ?: ""
        val senderId = m.optString("senderId", "")
        val kind = m.optString("kind", "")
        if (senderId.isEmpty() || senderId == myUid || kind == "system") return

        var callMode = "audio"
        if (kind == "call") {
            val callInfo = m.optJSONObject("callInfo") ?: try {
                JSONObject(m.optString("body", "{}"))
            } catch (_: Exception) {
                JSONObject()
            }
            val callStatus = callInfo.optString("status", "completed")
            callMode = callInfo.optString("mode", "audio")
            if (callStatus != "missed") return
        }

        val chatType = envelope.optString("chatType", "dm")
        if (chatType == "dm" && !prefs.getBoolean(KEY_NOTIFY_DMS, true)) return
        if (chatType == "group" && !prefs.getBoolean(KEY_NOTIFY_GROUPS, true)) return

        val showPreview = prefs.getBoolean(KEY_NOTIFY_PREVIEW, true)
        val senderName = envelope.optString("senderName", "Zovio")
        val chatName = envelope.optString("chatName", "")
        val chatId = m.optString("chatId", "")
        val isGroup = chatType == "group"

        val title = if (!showPreview) {
            "Zovio — New Encrypted Activity"
        } else if (isGroup && chatName.isNotEmpty()) {
            chatName
        } else {
            senderName
        }

        val decrypted = if (showPreview && kind != "call" && m.has("iv") && m.has("ct")) {
            decryptPayload(this, chatId, m.optString("iv", ""), m.optString("ct", ""))
        } else null

        val body = if (!showPreview) {
            "Open Zovio to view encrypted message"
        } else when (kind) {
            "call" -> if (callMode == "video") "Missed video call" else "Missed voice call"
            "image", "photo" -> {
                val cap = decrypted?.optString("caption", "")?.trim() ?: ""
                if (cap.isNotEmpty()) "Photo: $cap" else "Sent a photo"
            }
            "video" -> {
                val cap = decrypted?.optString("caption", "")?.trim() ?: ""
                if (cap.isNotEmpty()) "Video: $cap" else "Sent a video"
            }
            "audio", "voice" -> "Sent a voice note"
            "file" -> {
                val fn = decrypted?.optString("name", "")?.trim() ?: ""
                if (fn.isNotEmpty()) "File: $fn" else "Sent a file"
            }
            "sticker", "gif" -> "Sent a sticker"
            "location", "live" -> {
                val lbl = decrypted?.optString("label", "")?.trim() ?: ""
                if (kind == "live") "Sharing live location${if (lbl.isNotEmpty()) ": $lbl" else ""}"
                else if (lbl.isNotEmpty()) "Location: $lbl" else "Shared a location"
            }
            "poll" -> {
                val q = decrypted?.optString("question", "")?.trim() ?: ""
                if (q.isNotEmpty()) "Poll: $q" else "Created a poll"
            }
            "todo" -> {
                val t = decrypted?.optString("title", "")?.trim() ?: ""
                if (t.isNotEmpty()) "Checklist: $t" else "Shared a checklist"
            }
            else -> {
                val txt = decrypted?.optString("text", "")?.trim() ?: ""
                if (txt.isNotEmpty()) txt else "Sent an encrypted message"
            }
        }

        showSystemNotification(
            context = this,
            title = title,
            body = body,
            chatId = chatId,
            tag = if (chatId.isNotEmpty()) "chat-$chatId" else "zovio-msg",
            category = chatType,
            silent = isDndOrMuted(this),
            senderName = senderName,
            chatName = chatName,
            isGroup = isGroup
        )
    }

    override fun onDestroy() {
        closeSocket()
        super.onDestroy()
    }
}
