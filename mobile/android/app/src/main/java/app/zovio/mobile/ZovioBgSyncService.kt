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
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class ZovioBgSyncService : Service() {

    companion object {
        const val PREFS_NAME = "zovio_bg_prefs"
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

        const val ACTION_START = "app.zovio.mobile.BG_START"
        const val ACTION_STOP = "app.zovio.mobile.BG_STOP"

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

        fun cancelNotificationByTag(context: Context, tag: String) {
            if (tag.isEmpty()) return
            val reqCode = (tag.hashCode() and 0x7fffffff).coerceAtLeast(1)
            try {
                NotificationManagerCompat.from(context).cancel(tag, reqCode)
            } catch (_: Exception) {}
        }

        fun showSystemNotification(
            context: Context,
            title: String,
            body: String,
            chatId: String = "",
            tag: String = "zovio",
            category: String = "",
            silent: Boolean = false,
            incomingCallJson: String = ""
        ): Boolean {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            ) {
                return false
            }

            ensureChannels(context)
            val isCall = category == "call"
            val channelId = when {
                isCall && !silent -> CHANNEL_CALL_RING
                silent -> CHANNEL_SILENT
                else -> CHANNEL_ALERTS
            }

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
                .setCategory(if (isCall) NotificationCompat.CATEGORY_CALL else NotificationCompat.CATEGORY_MESSAGE)
                .setPriority(
                    when {
                        silent -> NotificationCompat.PRIORITY_LOW
                        isCall -> NotificationCompat.PRIORITY_MAX
                        else -> NotificationCompat.PRIORITY_HIGH
                    }
                )
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setSilent(silent)

            if (isCall) {
                builder.setFullScreenIntent(pendingIntent, true)
                builder.setTimeoutAfter(42_000L)
            }

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

        val chatType = envelope.optString("chatType", "dm")
        if (chatType == "dm" && !prefs.getBoolean(KEY_NOTIFY_DMS, true)) return
        if (chatType == "group" && !prefs.getBoolean(KEY_NOTIFY_GROUPS, true)) return

        val showPreview = prefs.getBoolean(KEY_NOTIFY_PREVIEW, true)
        val senderName = envelope.optString("senderName", "Zovio")
        val chatName = envelope.optString("chatName", "")
        val chatId = m.optString("chatId", "")

        val title = if (!showPreview) {
            "Zovio — New Encrypted Activity"
        } else if (chatType == "group" && chatName.isNotEmpty()) {
            "$senderName ($chatName)"
        } else {
            senderName
        }
        val body = if (!showPreview) {
            "Open Zovio to view encrypted message"
        } else when (kind) {
            "image", "photo" -> "Sent a photo"
            "video" -> "Sent a video"
            "audio", "voice" -> "Sent a voice note"
            "file" -> "Sent a file"
            "sticker", "gif" -> "Sent a sticker"
            "location", "live" -> "Shared a location"
            else -> "Sent an encrypted message"
        }

        showSystemNotification(
            context = this,
            title = title,
            body = body,
            chatId = chatId,
            tag = if (chatId.isNotEmpty()) "chat-$chatId" else "zovio-msg",
            category = chatType,
            silent = false
        )
    }

    override fun onDestroy() {
        closeSocket()
        super.onDestroy()
    }
}
