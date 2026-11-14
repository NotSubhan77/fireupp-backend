package app.zovio.mobile

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.RemoteInput
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.TimeUnit

class ZovioNotificationReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_INLINE_REPLY = "app.zovio.mobile.ACTION_INLINE_REPLY"
        const val ACTION_MARK_READ = "app.zovio.mobile.ACTION_MARK_READ"
        const val ACTION_CALL_DECLINE = "app.zovio.mobile.ACTION_CALL_DECLINE"
        const val KEY_REMOTE_INPUT_REPLY = "zovio_reply_text"
        const val EXTRA_CHAT_ID = "chatId"
        const val EXTRA_TAG = "tag"
        const val EXTRA_TITLE = "title"
        const val EXTRA_IS_GROUP = "isGroup"
        const val EXTRA_CALL_JSON = "incomingCallJson"

        private val httpClient by lazy {
            OkHttpClient.Builder()
                .connectTimeout(12, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .writeTimeout(15, TimeUnit.SECONDS)
                .build()
        }
    }

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent == null) return
        val action = intent.action ?: return
        val chatId = intent.getStringExtra(EXTRA_CHAT_ID) ?: ""
        val tag = intent.getStringExtra(EXTRA_TAG) ?: (if (chatId.isNotEmpty()) "chat-$chatId" else "zovio-msg")

        when (action) {
            ACTION_MARK_READ -> {
                if (tag.isNotEmpty()) {
                    ZovioBgSyncService.cancelNotificationByTag(context, tag)
                }
                if (chatId.isEmpty()) return
                val pending = goAsync()
                Thread {
                    try {
                        markChatRead(context, chatId)
                    } finally {
                        pending.finish()
                    }
                }.start()
            }

            ACTION_INLINE_REPLY -> {
                val results = RemoteInput.getResultsFromIntent(intent)
                val replyText = results?.getCharSequence(KEY_REMOTE_INPUT_REPLY)?.toString()?.trim() ?: ""
                if (chatId.isEmpty() || replyText.isEmpty()) {
                    ZovioBgSyncService.refreshChatNotificationSilent(context, tag)
                    return
                }

                val title = intent.getStringExtra(EXTRA_TITLE) ?: "Zovio"
                val isGroup = intent.getBooleanExtra(EXTRA_IS_GROUP, false)

                // Immediately reflect sent reply in the MessagingStyle stack and stop spinner
                ZovioBgSyncService.appendOwnReplyToNotification(
                    context = context,
                    tag = tag,
                    chatId = chatId,
                    title = title,
                    replyText = replyText,
                    isGroup = isGroup
                )

                val pending = goAsync()
                Thread {
                    try {
                        sendEncryptedReply(context, chatId, tag, title, isGroup, replyText)
                    } finally {
                        pending.finish()
                    }
                }.start()
            }

            ACTION_CALL_DECLINE -> {
                if (tag.isNotEmpty()) {
                    ZovioBgSyncService.cancelNotificationByTag(context, tag)
                }
                ZovioBgSyncService.cancelNotificationByTag(context, "call-incoming")
                val callRaw = intent.getStringExtra(EXTRA_CALL_JSON) ?: "{}"
                val callObj = try { JSONObject(callRaw) } catch (_: Exception) { JSONObject() }
                if (!callObj.has("chatId") && chatId.isNotEmpty()) {
                    try { callObj.put("chatId", chatId) } catch (_: Exception) {}
                }
                MainActivity.dispatchIncomingCallDeclined(callObj.toString())
                val pending = goAsync()
                Thread {
                    try {
                        ZovioBgSyncService.sendCallDeclineSignal(context, callObj)
                    } finally {
                        pending.finish()
                    }
                }.start()
            }
        }
    }

    private fun resolveHttpBaseUrl(context: Context): String {
        val prefs = context.getSharedPreferences(ZovioBgSyncService.PREFS_NAME, Context.MODE_PRIVATE)
        val raw = prefs.getString(ZovioBgSyncService.KEY_WS_URL, ZovioBgSyncService.DEFAULT_WS_URL)
            ?: ZovioBgSyncService.DEFAULT_WS_URL
        return raw.trim()
            .replace(Regex("^wss://", RegexOption.IGNORE_CASE), "https://")
            .replace(Regex("^ws://", RegexOption.IGNORE_CASE), "http://")
            .replace(Regex("/ws/?$", RegexOption.IGNORE_CASE), "")
            .trimEnd('/')
    }

    private fun markChatRead(context: Context, chatId: String) {
        val prefs = context.getSharedPreferences(ZovioBgSyncService.PREFS_NAME, Context.MODE_PRIVATE)
        val token = prefs.getString(ZovioBgSyncService.KEY_TOKEN, "") ?: ""
        if (token.isEmpty()) return
        val baseUrl = resolveHttpBaseUrl(context)
        try {
            val req = Request.Builder()
                .url("$baseUrl/api/chats/$chatId/read")
                .header("Authorization", "Bearer $token")
                .post("{}".toRequestBody("application/json; charset=utf-8".toMediaType()))
                .build()
            httpClient.newCall(req).execute().use { /* ignored */ }
        } catch (_: Exception) {}
    }

    private fun sendEncryptedReply(
        context: Context,
        chatId: String,
        tag: String,
        title: String,
        isGroup: Boolean,
        replyText: String
    ) {
        val prefs = context.getSharedPreferences(ZovioBgSyncService.PREFS_NAME, Context.MODE_PRIVATE)
        val token = prefs.getString(ZovioBgSyncService.KEY_TOKEN, "") ?: ""
        if (token.isEmpty()) return

        val encrypted = ZovioBgSyncService.encryptTextPayload(context, chatId, replyText)
        if (encrypted == null) {
            ZovioBgSyncService.appendOwnReplyToNotification(
                context = context,
                tag = tag,
                chatId = chatId,
                title = title,
                replyText = "Open Zovio once to unlock inline reply for this chat",
                isGroup = isGroup
            )
            return
        }

        val (ivB64, ctB64, keyVersion) = encrypted
        val baseUrl = resolveHttpBaseUrl(context)
        val payload = JSONObject().apply {
            put("kind", "text")
            put("iv", ivB64)
            put("ct", ctB64)
            put("keyVersion", keyVersion)
            put("clientNonce", "nr-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(8)}")
        }

        try {
            val sendReq = Request.Builder()
                .url("$baseUrl/api/chats/$chatId/messages")
                .header("Authorization", "Bearer $token")
                .post(payload.toString().toRequestBody("application/json; charset=utf-8".toMediaType()))
                .build()
            httpClient.newCall(sendReq).execute().use { resp ->
                if (!resp.isSuccessful) {
                    ZovioBgSyncService.appendOwnReplyToNotification(
                        context = context,
                        tag = tag,
                        chatId = chatId,
                        title = title,
                        replyText = "Reply failed (HTTP ${resp.code}) — tap to open chat",
                        isGroup = isGroup
                    )
                    return
                }
            }
            markChatRead(context, chatId)
        } catch (_: Exception) {
            ZovioBgSyncService.appendOwnReplyToNotification(
                context = context,
                tag = tag,
                chatId = chatId,
                title = title,
                replyText = "Network unavailable — tap to open chat",
                isGroup = isGroup
            )
        }
    }
}
