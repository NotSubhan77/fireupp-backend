package app.zovio.mobile

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Rect
import android.graphics.Typeface
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.RingtoneManager
import android.net.ConnectivityManager
import android.net.Network
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.util.Base64
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.Person
import androidx.core.app.RemoteInput
import androidx.core.content.ContextCompat
import androidx.core.graphics.drawable.IconCompat
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONArray
import org.json.JSONObject
import java.math.BigInteger
import java.security.AlgorithmParameters
import java.security.KeyFactory
import java.security.SecureRandom
import java.security.spec.ECGenParameterSpec
import java.security.spec.ECParameterSpec
import java.security.spec.ECPoint
import java.security.spec.ECPrivateKeySpec
import java.security.spec.ECPublicKeySpec
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import javax.crypto.Cipher
import javax.crypto.KeyAgreement
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
        const val KEY_NOTIFY_EVENTS = "notifyEvents"
        const val KEY_NOTIFY_TASKS = "notifyTasks"
        const val KEY_NOTIFY_REMINDERS = "notifyReminders"
        const val KEY_BG_KEEP_ALIVE = "bgKeepAlive"
        const val KEY_NOTIFY_PREVIEW = "notifyPreview"
        const val KEY_WS_URL = "wsUrl"
        const val KEY_LAST_NOTIF_TS = "lastNotifiedMsgTs"
        private const val KEY_NOTIFIED_IDS = "notifiedMsgIds"
        private const val KEY_SCHEDULED_CODES = "wsScheduledReqCodes"
        private const val WATCHDOG_REQ_CODE = 4901
        private const val RESTART_REQ_CODE = 4902

        @JvmField val DEFAULT_WS_URL: String = BuildConfig.ZOVIO_WS_URL
        const val CHANNEL_BG_SYNC = "zovio_bg_sync_v1"
        const val CHANNEL_CALL_RING = "zovio_calls_ring_v4"
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
            val isGroup: Boolean,
            val avatar: String = "",
            val avatarColor: String = ""
        )

        private val stackLock = Any()
        private val messageStacks = linkedMapOf<String, MutableList<MsgEntry>>()
        private val chatMetaMap = hashMapOf<String, ChatMeta>()
        private val avatarBmpCache = ConcurrentHashMap<String, Bitmap>()
        private val avatarHttpClient by lazy {
            OkHttpClient.Builder()
                .connectTimeout(2500, TimeUnit.MILLISECONDS)
                .readTimeout(2500, TimeUnit.MILLISECONDS)
                .build()
        }
        private val restHttpClient by lazy {
            OkHttpClient.Builder()
                .connectTimeout(8, TimeUnit.SECONDS)
                .readTimeout(10, TimeUnit.SECONDS)
                .build()
        }

        private fun toCircularBitmap(src: Bitmap): Bitmap {
            val size = 128
            val side = minOf(src.width, src.height).coerceAtLeast(1)
            val xOff = (src.width - side) / 2
            val yOff = (src.height - side) / 2
            val square = if (src.width == size && src.height == size) {
                src
            } else {
                val cropped = Bitmap.createBitmap(src, xOff, yOff, side, side)
                val scaled = Bitmap.createScaledBitmap(cropped, size, size, true)
                if (cropped !== src && cropped !== scaled) cropped.recycle()
                scaled
            }
            val out = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(out)
            val paint = Paint(Paint.ANTI_ALIAS_FLAG)
            val rect = Rect(0, 0, size, size)
            canvas.drawARGB(0, 0, 0, 0)
            canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint)
            paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
            canvas.drawBitmap(square, rect, rect, paint)
            return out
        }

        private fun createMonogramBitmap(title: String, avatarColor: String): Bitmap {
            val size = 128
            val out = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(out)
            val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG)
            bgPaint.color = try {
                val clean = avatarColor.trim()
                if (clean.startsWith("#") && (clean.length == 7 || clean.length == 9 || clean.length == 4)) {
                    Color.parseColor(clean)
                } else {
                    0xFF6366F1.toInt()
                }
            } catch (_: Exception) {
                0xFF6366F1.toInt()
            }
            canvas.drawCircle(size / 2f, size / 2f, size / 2f, bgPaint)
            val initial = (title.trim().firstOrNull()?.uppercaseChar() ?: 'Z').toString()
            val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.WHITE
                textSize = 54f
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                textAlign = Paint.Align.CENTER
            }
            val yPos = size / 2f - (textPaint.descent() + textPaint.ascent()) / 2f
            canvas.drawText(initial, size / 2f, yPos, textPaint)
            return out
        }

        private fun resolveAvatarBitmap(avatar: String, title: String, avatarColor: String): Bitmap {
            val raw = avatar.trim()
            if (raw.isNotEmpty()) {
                val cached = avatarBmpCache[raw]
                if (cached != null && !cached.isRecycled) return cached
                try {
                    if (raw.startsWith("data:image/")) {
                        val comma = raw.indexOf(',')
                        if (comma > 0) {
                            val b64 = raw.substring(comma + 1)
                            val bytes = Base64.decode(b64, Base64.DEFAULT)
                            val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                            BitmapFactory.decodeByteArray(bytes, 0, bytes.size, opts)
                            var sample = 1
                            while (opts.outWidth / sample > 256 || opts.outHeight / sample > 256) sample *= 2
                            val decOpts = BitmapFactory.Options().apply { inSampleSize = sample }
                            val rawBmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, decOpts)
                            if (rawBmp != null) {
                                val circ = toCircularBitmap(rawBmp)
                                if (rawBmp !== circ) rawBmp.recycle()
                                if (avatarBmpCache.size > 48) avatarBmpCache.clear()
                                avatarBmpCache[raw] = circ
                                return circ
                            }
                        }
                    } else if (Looper.myLooper() != Looper.getMainLooper()) {
                        val url = when {
                            raw.startsWith("https://") || raw.startsWith("http://") -> raw
                            raw.startsWith("/") -> "${BuildConfig.ZOVIO_ORIGIN}$raw"
                            else -> ""
                        }
                        if (url.isNotEmpty()) {
                            val req = Request.Builder().url(url).build()
                            avatarHttpClient.newCall(req).execute().use { resp ->
                                if (resp.isSuccessful) {
                                    val bytes = resp.body?.bytes()
                                    if (bytes != null && bytes.isNotEmpty()) {
                                        val rawBmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                                        if (rawBmp != null) {
                                            val circ = toCircularBitmap(rawBmp)
                                            if (rawBmp !== circ) rawBmp.recycle()
                                            if (avatarBmpCache.size > 48) avatarBmpCache.clear()
                                            avatarBmpCache[raw] = circ
                                            return circ
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (_: Exception) {}
            }
            val monoKey = "mono:${title.trim().firstOrNull()?.uppercaseChar() ?: 'Z'}:$avatarColor"
            avatarBmpCache[monoKey]?.takeIf { !it.isRecycled }?.let { return it }
            val mono = createMonogramBitmap(title, avatarColor)
            if (avatarBmpCache.size > 48) avatarBmpCache.clear()
            avatarBmpCache[monoKey] = mono
            return mono
        }

        @Volatile
        var isAppInForeground: Boolean = false

        @Volatile
        private var activeInstance: ZovioBgSyncService? = null

        fun sendCallDeclineSignal(context: Context, callObj: JSONObject) {
            val chatId = callObj.optString("chatId", "")
            val code = callObj.optString("code", "")
            val callId = callObj.optString("callId", "")
            if (chatId.isEmpty() || code.isEmpty()) return

            val declineJson = JSONObject().apply {
                put("type", "call:response")
                put("chatId", chatId)
                put("code", code)
                if (callId.isNotEmpty()) put("callId", callId)
                put("response", "decline")
            }.toString()

            val active = activeInstance
            val liveWs = active?.ws
            if (liveWs != null) {
                try {
                    if (liveWs.send(declineJson)) return
                } catch (_: Exception) {}
            }

            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val token = prefs.getString(KEY_TOKEN, "") ?: ""
            if (token.isEmpty()) return
            val wsUrl = prefs.getString(KEY_WS_URL, DEFAULT_WS_URL) ?: DEFAULT_WS_URL
            val client = OkHttpClient.Builder()
                .connectTimeout(8, TimeUnit.SECONDS)
                .readTimeout(8, TimeUnit.SECONDS)
                .build()
            val req = Request.Builder().url(wsUrl).build()
            client.newWebSocket(req, object : WebSocketListener() {
                override fun onOpen(webSocket: WebSocket, response: Response) {
                    try {
                        val auth = JSONObject().apply {
                            put("type", "auth")
                            put("token", token)
                            put("active", false)
                            put("bgListener", true)
                            put("deviceRole", "phone")
                            put("deviceId", (prefs.getString(KEY_DEVICE_ID, "") ?: "") + ":decline")
                        }
                        webSocket.send(auth.toString())
                        webSocket.send(declineJson)
                    } catch (_: Exception) {
                    } finally {
                        webSocket.close(1000, null)
                    }
                }
            })
        }

        fun isBgKeepAliveEnabled(context: Context): Boolean {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val token = prefs.getString(KEY_TOKEN, "") ?: ""
            return token.isNotEmpty() && prefs.getBoolean(KEY_BG_KEEP_ALIVE, true)
        }

        fun startOrRefresh(context: Context) {
            if (!isBgKeepAliveEnabled(context)) {
                stop(context)
                return
            }
            scheduleWatchdog(context)
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
            cancelWatchdog(context)
            val intent = Intent(context, ZovioBgSyncService::class.java).apply {
                action = ACTION_STOP
            }
            try {
                context.startService(intent)
            } catch (_: Exception) {}
        }

        fun scheduleRestartAlarm(context: Context, delayMs: Long = 1200L) {
            if (!isBgKeepAliveEnabled(context)) return
            try {
                val am = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
                val i = Intent(context, ZovioBgRestartReceiver::class.java).apply {
                    action = ZovioBgRestartReceiver.ACTION_RESTART_BG
                }
                val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
                val pi = PendingIntent.getBroadcast(context, RESTART_REQ_CODE, i, flags)
                val triggerAt = SystemClock.elapsedRealtime() + delayMs.coerceAtLeast(600L)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi)
                } else {
                    am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi)
                }
            } catch (_: Exception) {}
        }

        fun scheduleWatchdog(context: Context) {
            if (!isBgKeepAliveEnabled(context)) return
            try {
                val am = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
                val i = Intent(context, ZovioBgRestartReceiver::class.java).apply {
                    action = ZovioBgRestartReceiver.ACTION_RESTART_BG
                }
                val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
                val pi = PendingIntent.getBroadcast(context, WATCHDOG_REQ_CODE, i, flags)
                val intervalMs = 4 * 60 * 1000L
                am.setInexactRepeating(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    SystemClock.elapsedRealtime() + intervalMs,
                    intervalMs,
                    pi
                )
            } catch (_: Exception) {}
        }

        fun cancelWatchdog(context: Context) {
            try {
                val am = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
                val i = Intent(context, ZovioBgRestartReceiver::class.java).apply {
                    action = ZovioBgRestartReceiver.ACTION_RESTART_BG
                }
                val flags = PendingIntent.FLAG_NO_CREATE or
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
                val pi = PendingIntent.getBroadcast(context, WATCHDOG_REQ_CODE, i, flags)
                if (pi != null) am.cancel(pi)
            } catch (_: Exception) {}
        }

        fun showReminderNotification(
            context: Context,
            title: String,
            body: String,
            tag: String = "ws-reminder",
            category: String = "reminder",
            silent: Boolean = false
        ): Boolean {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            ) {
                return false
            }
            ensureChannels(context)
            val effectiveSilent = silent || isDndOrMuted(context)
            val channelId = if (effectiveSilent) CHANNEL_SILENT else CHANNEL_ALERTS
            val reqCode = (("rem:$tag").hashCode() and 0x7fffffff).coerceAtLeast(100)
            val tapIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
            }
            val piFlags = PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
            val pendingIntent = PendingIntent.getActivity(context, reqCode, tapIntent, piFlags)

            val builder = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.drawable.ic_stat_zovio)
                .setContentTitle(title.ifEmpty { "Zovio Reminder" })
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setCategory(if (category == "event") NotificationCompat.CATEGORY_EVENT else NotificationCompat.CATEGORY_REMINDER)
                .setPriority(if (effectiveSilent) NotificationCompat.PRIORITY_LOW else NotificationCompat.PRIORITY_HIGH)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setSilent(effectiveSilent)

            return try {
                NotificationManagerCompat.from(context).notify("rem-$tag", reqCode, builder.build())
                true
            } catch (_: Exception) {
                false
            }
        }

        fun scheduleWorkspaceAlarms(context: Context, alertsJson: String) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val am = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val piFlags = PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0

            // Cancel previously scheduled workspace reminder alarms before re-scheduling fresh ones
            val prevCodes = prefs.getString(KEY_SCHEDULED_CODES, "") ?: ""
            prevCodes.split(",").filter { it.isNotBlank() }.forEach { codeStr ->
                val rc = codeStr.toIntOrNull() ?: return@forEach
                try {
                    val cancelIntent = Intent(context, ZovioBgRestartReceiver::class.java).apply {
                        action = ZovioBgRestartReceiver.ACTION_DUE_ALERT
                    }
                    val noCreateFlags = PendingIntent.FLAG_NO_CREATE or
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
                    val pi = PendingIntent.getBroadcast(context, rc, cancelIntent, noCreateFlags)
                    if (pi != null) am.cancel(pi)
                } catch (_: Exception) {}
            }

            val newCodes = mutableListOf<String>()
            val nowMs = System.currentTimeMillis()
            try {
                val arr = JSONArray(alertsJson)
                val limit = minOf(arr.length(), 40)
                for (i in 0 until limit) {
                    val item = arr.optJSONObject(i) ?: continue
                    val atMs = item.optLong("atMs", 0L)
                    if (atMs <= nowMs - 30_000L) continue
                    val key = item.optString("key", "alert-$i")
                    val rc = ((key.hashCode() and 0x0fffffff).coerceAtLeast(10_000))
                    val intent = Intent(context, ZovioBgRestartReceiver::class.java).apply {
                        action = ZovioBgRestartReceiver.ACTION_DUE_ALERT
                        putExtra(ZovioBgRestartReceiver.EXTRA_TITLE, item.optString("title", "Zovio Reminder"))
                        putExtra(ZovioBgRestartReceiver.EXTRA_BODY, item.optString("body", ""))
                        putExtra(ZovioBgRestartReceiver.EXTRA_CATEGORY, item.optString("category", "reminder"))
                        putExtra(ZovioBgRestartReceiver.EXTRA_TAG, item.optString("tag", key))
                    }
                    val pi = PendingIntent.getBroadcast(context, rc, intent, piFlags)
                    val safeAt = maxOf(atMs, nowMs + 1500L)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, safeAt, pi)
                    } else {
                        am.set(AlarmManager.RTC_WAKEUP, safeAt, pi)
                    }
                    newCodes.add(rc.toString())
                }
            } catch (_: Exception) {}
            prefs.edit().putString(KEY_SCHEDULED_CODES, newCodes.joinToString(",")).apply()
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
            val ver = keyVersion.coerceAtLeast(1)
            val prefs = context.getSharedPreferences(KEYS_PREFS_NAME, Context.MODE_PRIVATE)
            val ed = prefs.edit()
                .putString("key_$chatId", keyB64)
                .putString("key_${chatId}_v$ver", keyB64)
                .putInt("kv_$chatId", ver)
                .putBoolean("grp_$chatId", isGroup)
            if (chatTitle.isNotEmpty()) ed.putString("title_$chatId", chatTitle)
            ed.apply()
        }

        private fun resolveHttpBaseUrl(context: Context): String {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val raw = prefs.getString(KEY_WS_URL, DEFAULT_WS_URL) ?: DEFAULT_WS_URL
            return raw.trim()
                .replace(Regex("^wss://", RegexOption.IGNORE_CASE), "https://")
                .replace(Regex("^ws://", RegexOption.IGNORE_CASE), "http://")
                .replace(Regex("/ws/?$", RegexOption.IGNORE_CASE), "")
                .trimEnd('/')
        }

        private fun getP256Params(): ECParameterSpec {
            val params = AlgorithmParameters.getInstance("EC")
            params.init(ECGenParameterSpec("secp256r1"))
            return params.getParameterSpec(ECParameterSpec::class.java)
        }

        private fun b64UrlToUnsignedBigInt(s: String): BigInteger {
            val bytes = Base64.decode(s, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
            return BigInteger(1, bytes)
        }

        private fun unwrapEcdhKeyB64(
            privJwkJson: String,
            wrapperPubJwkJson: String,
            ivB64: String,
            ctB64: String
        ): String? {
            return try {
                val privObj = JSONObject(privJwkJson)
                val pubObj = JSONObject(wrapperPubJwkJson)
                val spec = getP256Params()
                val kf = KeyFactory.getInstance("EC")

                val privD = b64UrlToUnsignedBigInt(privObj.getString("d"))
                val myPriv = kf.generatePrivate(ECPrivateKeySpec(privD, spec))

                val pubX = b64UrlToUnsignedBigInt(pubObj.getString("x"))
                val pubY = b64UrlToUnsignedBigInt(pubObj.getString("y"))
                val theirPub = kf.generatePublic(ECPublicKeySpec(ECPoint(pubX, pubY), spec))

                val ka = KeyAgreement.getInstance("ECDH")
                ka.init(myPriv)
                ka.doPhase(theirPub, true)
                val sharedSecret = ka.generateSecret()

                val iv = Base64.decode(ivB64, Base64.DEFAULT)
                val ct = Base64.decode(ctB64, Base64.DEFAULT)
                val aesKey = SecretKeySpec(sharedSecret, "AES")
                val cipher = Cipher.getInstance("AES/GCM/NoPadding")
                cipher.init(Cipher.DECRYPT_MODE, aesKey, GCMParameterSpec(128, iv))
                val rawChatKey = cipher.doFinal(ct)
                Base64.encodeToString(rawChatKey, Base64.NO_WRAP)
            } catch (_: Exception) {
                null
            }
        }

        private fun fetchAndCacheChatKeyFromServer(
            context: Context,
            chatId: String,
            keyVersion: Int
        ): String? {
            if (Looper.myLooper() == Looper.getMainLooper()) return null
            val bgPrefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val keyPrefs = context.getSharedPreferences(KEYS_PREFS_NAME, Context.MODE_PRIVATE)
            val token = bgPrefs.getString(KEY_TOKEN, "") ?: ""
            val uid = bgPrefs.getString(KEY_USER_ID, "") ?: ""
            val privJwk = if (uid.isNotEmpty()) (keyPrefs.getString("privJwk_$uid", null) ?: "") else ""
            if (token.isEmpty() || uid.isEmpty() || privJwk.isEmpty()) return null

            val baseUrl = resolveHttpBaseUrl(context)
            return try {
                val chatReq = Request.Builder()
                    .url("$baseUrl/api/chats/$chatId")
                    .header("Authorization", "Bearer $token")
                    .build()
                val chatObj = restHttpClient.newCall(chatReq).execute().use { resp ->
                    if (!resp.isSuccessful) return null
                    val str = resp.body?.string() ?: return null
                    JSONObject(str)
                }
                val keysObj = chatObj.optJSONObject("keys") ?: return null
                val box = keysObj.optJSONObject(keyVersion.toString())
                    ?: keysObj.optJSONObject((chatObj.optInt("keyVersion", 1)).toString())
                    ?: return null
                val wrapperId = box.optString("wrapperId", "")
                val iv = box.optString("iv", "")
                val ct = box.optString("ct", "")
                if (wrapperId.isEmpty() || iv.isEmpty() || ct.isEmpty()) return null

                val wrapperPubJwk = if (wrapperId == uid) {
                    keyPrefs.getString("pubJwk_$uid", null) ?: ""
                } else {
                    val lookupBody = JSONObject().put("ids", JSONArray().put(wrapperId))
                        .toString()
                        .toRequestBody("application/json; charset=utf-8".toMediaType())
                    val userReq = Request.Builder()
                        .url("$baseUrl/api/users/lookup")
                        .header("Authorization", "Bearer $token")
                        .post(lookupBody)
                        .build()
                    restHttpClient.newCall(userReq).execute().use { uResp ->
                        if (!uResp.isSuccessful) return null
                        val arr = JSONArray(uResp.body?.string() ?: "[]")
                        arr.optJSONObject(0)?.optString("publicKey", "") ?: ""
                    }
                }
                if (wrapperPubJwk.isEmpty()) return null

                val unwrappedB64 = unwrapEcdhKeyB64(privJwk, wrapperPubJwk, iv, ct) ?: return null
                saveChatKey(
                    context = context,
                    chatId = chatId,
                    keyB64 = unwrappedB64,
                    keyVersion = keyVersion,
                    chatTitle = chatObj.optString("name", ""),
                    isGroup = chatObj.optString("type", "") == "group"
                )
                unwrappedB64
            } catch (_: Exception) {
                null
            }
        }

        fun decryptPayload(
            context: Context,
            chatId: String,
            ivB64: String,
            ctB64: String,
            keyVersion: Int = 1
        ): JSONObject? {
            if (chatId.isEmpty() || ivB64.isEmpty() || ctB64.isEmpty()) return null
            val prefs = context.getSharedPreferences(KEYS_PREFS_NAME, Context.MODE_PRIVATE)
            val candidates = linkedSetOf<String>()
            prefs.getString("key_${chatId}_v$keyVersion", null)?.let { if (it.isNotEmpty()) candidates.add(it) }
            prefs.getString("key_$chatId", null)?.let { if (it.isNotEmpty()) candidates.add(it) }

            for (keyB64 in candidates) {
                try {
                    val keyBytes = Base64.decode(keyB64, Base64.DEFAULT)
                    val ivBytes = Base64.decode(ivB64, Base64.DEFAULT)
                    val ctBytes = Base64.decode(ctB64, Base64.DEFAULT)
                    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
                    cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(keyBytes, "AES"), GCMParameterSpec(128, ivBytes))
                    val plain = cipher.doFinal(ctBytes)
                    return JSONObject(String(plain, Charsets.UTF_8))
                } catch (_: Exception) {}
            }

            // Fallback: fetch chat box from server and unwrap natively with stored ECDH P-256 private JWK
            val fetchedB64 = fetchAndCacheChatKeyFromServer(context, chatId, keyVersion) ?: return null
            return try {
                val keyBytes = Base64.decode(fetchedB64, Base64.DEFAULT)
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

        private val notifiedMsgLock = Any()

        private fun hasNotifiedMsgId(context: Context, msgId: String): Boolean {
            if (msgId.isEmpty()) return false
            synchronized(notifiedMsgLock) {
                val raw = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                    .getString(KEY_NOTIFIED_IDS, "") ?: ""
                if (raw.isEmpty()) return false
                return raw.split(",").any { it == msgId }
            }
        }

        private fun markMsgNotified(context: Context, msgId: String, msgTs: Long) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            synchronized(notifiedMsgLock) {
                val ed = prefs.edit()
                if (msgTs > 0L) {
                    val prevTs = prefs.getLong(KEY_LAST_NOTIF_TS, 0L)
                    if (msgTs > prevTs) ed.putLong(KEY_LAST_NOTIF_TS, msgTs)
                }
                if (msgId.isNotEmpty()) {
                    val existing = (prefs.getString(KEY_NOTIFIED_IDS, "") ?: "")
                        .split(",")
                        .filter { it.isNotEmpty() }
                        .toMutableList()
                    existing.remove(msgId)
                    existing.add(msgId)
                    while (existing.size > 160) existing.removeAt(0)
                    ed.putString(KEY_NOTIFIED_IDS, existing.joinToString(","))
                }
                ed.apply()
            }
        }

        private fun pruneDismissedStacksFromOS(context: Context, excludeTag: String = "") {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return
            val nm = context.getSystemService(NotificationManager::class.java) ?: return
            val activeTags = try {
                nm.activeNotifications.mapNotNull { it.tag }.toSet()
            } catch (_: Exception) {
                return
            }
            synchronized(stackLock) {
                val it = messageStacks.keys.iterator()
                while (it.hasNext()) {
                    val k = it.next()
                    if (k == excludeTag) continue
                    if (!activeTags.contains(k)) {
                        it.remove()
                        chatMetaMap.remove(k)
                    }
                }
            }
        }

        fun onNotificationDismissed(context: Context, tag: String) {
            if (tag.isEmpty()) return
            synchronized(stackLock) {
                messageStacks.remove(tag)
                chatMetaMap.remove(tag)
            }
            updateGroupSummaryNotification(context)
        }

        fun onSummaryDismissed(context: Context) {
            synchronized(stackLock) {
                messageStacks.clear()
                chatMetaMap.clear()
            }
            try {
                NotificationManagerCompat.from(context).cancel(SUMMARY_NOTIFICATION_ID)
            } catch (_: Exception) {}
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
            pruneDismissedStacksFromOS(context)
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
            val dismissIntent = Intent(context, ZovioNotificationReceiver::class.java).apply {
                action = ZovioNotificationReceiver.ACTION_SUMMARY_DISMISSED
            }
            val dismissPi = PendingIntent.getBroadcast(context, SUMMARY_NOTIFICATION_ID + 1, dismissIntent, piFlags)

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
                .setOnlyAlertOnce(true)
                .setAutoCancel(true)
                .setContentIntent(tapPi)
                .setDeleteIntent(dismissPi)
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
            val avatarBmp = resolveAvatarBitmap(meta?.avatar ?: "", title, meta?.avatarColor ?: "")
            val senderIcon = IconCompat.createWithBitmap(avatarBmp)
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
            val dismissIntent = Intent(context, ZovioNotificationReceiver::class.java).apply {
                action = ZovioNotificationReceiver.ACTION_NOTIF_DISMISSED
                putExtra(ZovioNotificationReceiver.EXTRA_TAG, tag)
                putExtra(ZovioNotificationReceiver.EXTRA_CHAT_ID, chatId)
            }
            val dismissPi = PendingIntent.getBroadcast(context, reqCode + 25000, dismissIntent, piImmutableFlags)

            val mePerson = Person.Builder().setName("You").build()
            val messagingStyle = NotificationCompat.MessagingStyle(mePerson)
            if (isGroup) {
                messagingStyle.setGroupConversation(true).setConversationTitle(title)
            } else {
                messagingStyle.setGroupConversation(false)
            }
            for (e in entries) {
                val person = if (e.isSelf) {
                    mePerson
                } else {
                    Person.Builder()
                        .setName(e.sender.ifEmpty { title })
                        .setIcon(senderIcon)
                        .build()
                }
                messagingStyle.addMessage(e.text, e.ts, person)
            }

            val lastText = entries.lastOrNull()?.text ?: ""
            val builder = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.drawable.ic_stat_zovio)
                .setLargeIcon(avatarBmp)
                .setContentTitle(title)
                .setContentText(lastText)
                .setStyle(messagingStyle)
                .setGroup(GROUP_KEY_MESSAGES)
                .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_CHILDREN)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setDeleteIntent(dismissPi)
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
                    .setShowsUserInterface(false)
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
            isGroup: Boolean = false,
            avatar: String = "",
            avatarColor: String = ""
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
                    val prev = chatMetaMap[tag]
                    chatMetaMap[tag] = ChatMeta(
                        chatId = chatId,
                        title = convTitle,
                        isGroup = isGroup,
                        avatar = avatar.ifEmpty { prev?.avatar ?: "" },
                        avatarColor = avatarColor.ifEmpty { prev?.avatarColor ?: "" }
                    )
                }
                return postStackedChatNotification(
                    context = context,
                    tag = tag,
                    silent = effectiveSilent,
                    onlyAlertOnce = false
                )
            }

            val callerAvatarBmp = resolveAvatarBitmap(avatar, title, avatarColor)
            val callerIcon = IconCompat.createWithBitmap(callerAvatarBmp)

            val channelId = if (!effectiveSilent) CHANNEL_CALL_RING else CHANNEL_SILENT
            val reqCode = (tag.hashCode() and 0x7fffffff).coerceAtLeast(1)
            val safeCallJson = if (incomingCallJson.isNotEmpty()) {
                incomingCallJson
            } else {
                JSONObject().apply {
                    put("chatId", chatId)
                    put("callerName", title)
                    put("callId", tag.removePrefix("call-"))
                }.toString()
            }

            val tapIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
                if (chatId.isNotEmpty()) putExtra("chatId", chatId)
                putExtra("incomingCallJson", safeCallJson)
                putExtra("notifTag", tag)
            }
            val piFlags = PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
            val pendingIntent = PendingIntent.getActivity(context, reqCode, tapIntent, piFlags)

            val acceptIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
                if (chatId.isNotEmpty()) putExtra("chatId", chatId)
                putExtra("incomingCallJson", safeCallJson)
                putExtra("callAction", "accept")
                putExtra("notifTag", tag)
            }
            val acceptPi = PendingIntent.getActivity(context, reqCode + 30000, acceptIntent, piFlags)

            val declineIntent = Intent(context, ZovioNotificationReceiver::class.java).apply {
                action = ZovioNotificationReceiver.ACTION_CALL_DECLINE
                putExtra(ZovioNotificationReceiver.EXTRA_CHAT_ID, chatId)
                putExtra(ZovioNotificationReceiver.EXTRA_TAG, tag)
                putExtra(ZovioNotificationReceiver.EXTRA_CALL_JSON, safeCallJson)
            }
            val declinePi = PendingIntent.getBroadcast(context, reqCode + 40000, declineIntent, piFlags)

            val callerPerson = Person.Builder()
                .setName(title.ifEmpty { "Zovio" })
                .setIcon(callerIcon)
                .setImportant(true)
                .build()

            val builder = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.drawable.ic_stat_zovio)
                .setLargeIcon(callerAvatarBmp)
                .setContentTitle(title.ifEmpty { "Incoming Call" })
                .setContentText(body)
                .setStyle(NotificationCompat.CallStyle.forIncomingCall(callerPerson, declinePi, acceptPi))
                .addPerson(callerPerson)
                .setOngoing(true)
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

            try { nm.deleteNotificationChannel("zovio_calls_ring_v3") } catch (_: Exception) {}
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
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    enableLights(true)
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
    @Volatile private var lastWsRxMs: Long = 0L

    private fun acquireShortWakeLock() {
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
            val wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Zovio::BgNotifyWakeLock")
            wl.setReferenceCounted(false)
            wl.acquire(4500L)
        } catch (_: Exception) {}
    }

    private val reconnectRunnable = Runnable {
        if (!isStopped) connectSocket()
    }

    private var netCallbackRegistered = false
    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            handler.post {
                if (isStopped) return@post
                val nowMs = System.currentTimeMillis()
                if (ws == null || (lastWsRxMs > 0L && nowMs - lastWsRxMs > 30_000L)) {
                    closeSocket()
                    reconnectAttempts = 0
                    connectSocket()
                }
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        activeInstance = this
        ensureChannels(this)
        try {
            val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            if (cm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                cm.registerDefaultNetworkCallback(networkCallback)
                netCallbackRegistered = true
            }
        } catch (_: Exception) {}
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            isStopped = true
            closeSocket()
            cancelWatchdog(this)
            try {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } catch (_: Exception) {}
            stopSelf()
            return START_NOT_STICKY
        }

        if (!isBgKeepAliveEnabled(this)) {
            cancelWatchdog(this)
            stopSelf()
            return START_NOT_STICKY
        }

        isStopped = false
        scheduleWatchdog(this)
        promoteForeground()
        connectSocket()
        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        isAppInForeground = false
        if (!isStopped && isBgKeepAliveEnabled(this)) {
            scheduleRestartAlarm(applicationContext, 1200L)
            try {
                sendBroadcast(
                    Intent(applicationContext, ZovioBgRestartReceiver::class.java).apply {
                        action = ZovioBgRestartReceiver.ACTION_RESTART_BG
                    }
                )
            } catch (_: Exception) {}
        }
    }

    @SuppressLint("InlinedApi")
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
            .setContentText("Connected for calls, messages & reminders")
            .setContentIntent(pi)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setSilent(true)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(BG_NOTIFICATION_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_REMOTE_MESSAGING)
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
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
                lastWsRxMs = System.currentTimeMillis()
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
                if (!isAppInForeground) {
                    Thread { catchUpUnreadMessages() }.start()
                }
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                lastWsRxMs = System.currentTimeMillis()
                try {
                    val obj = JSONObject(text)
                    val type = obj.optString("type", "")
                    val myUid = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                        .getString(KEY_USER_ID, "") ?: ""
                    when (type) {
                        "call:incoming" -> handleIncomingCallWs(webSocket, obj)
                        "call:ended", "call:answered-elsewhere", "call:accepted", "call:declined" -> {
                            val callTag = "call-${obj.optString("callId", obj.optString("code", ""))}"
                            cancelNotificationByTag(this@ZovioBgSyncService, callTag)
                            cancelNotificationByTag(this@ZovioBgSyncService, "call-incoming")
                        }
                        "msg:new" -> handleIncomingMessageWs(obj)
                        "chat:read-ack", "chat:read" -> {
                            val chatId = obj.optString("chatId", "")
                            val readerId = obj.optString("readerId", obj.optString("userId", ""))
                            if (chatId.isNotEmpty() && (readerId.isEmpty() || readerId == myUid)) {
                                cancelNotificationByTag(this@ZovioBgSyncService, "chat-$chatId")
                            }
                        }
                        "msg:delete-for-me" -> {
                            val chatId = obj.optString("chatId", "")
                            if (chatId.isNotEmpty() && obj.optInt("unread", -1) == 0) {
                                cancelNotificationByTag(this@ZovioBgSyncService, "chat-$chatId")
                            }
                        }
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
        val delayMs = (2500L * (1 shl reconnectAttempts.coerceAtMost(3))).coerceAtMost(15_000L)
        reconnectAttempts++
        handler.removeCallbacks(reconnectRunnable)
        handler.postDelayed(reconnectRunnable, delayMs)
    }

    private fun closeSocket() {
        handler.removeCallbacks(reconnectRunnable)
        try { ws?.close(1000, "Stopped") } catch (_: Exception) {}
        ws = null
    }

    private fun catchUpUnreadMessages() {
        if (isAppInForeground || isStopped) return
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(KEY_NOTIFY_ENABLED, true)) return
        val token = prefs.getString(KEY_TOKEN, "") ?: ""
        val myUid = prefs.getString(KEY_USER_ID, "") ?: ""
        if (token.isEmpty() || myUid.isEmpty()) return
        val lastNotifTs = prefs.getLong(KEY_LAST_NOTIF_TS, 0L)
        val baseUrl = resolveHttpBaseUrl(this)

        try {
            val req = Request.Builder()
                .url("$baseUrl/api/chats")
                .header("Authorization", "Bearer $token")
                .build()
            restHttpClient.newCall(req).execute().use { resp ->
                if (!resp.isSuccessful) return
                val raw = resp.body?.string() ?: return
                val chats = JSONArray(raw)
                for (i in 0 until chats.length()) {
                    val chat = chats.optJSONObject(i) ?: continue
                    if (chat.optInt("unread", 0) <= 0) continue
                    val mutedBy = chat.optJSONArray("mutedBy")
                    var isMuted = false
                    if (mutedBy != null) {
                        for (k in 0 until mutedBy.length()) {
                            if (mutedBy.optString(k) == myUid) { isMuted = true; break }
                        }
                    }
                    if (isMuted) continue

                    val lm = chat.optJSONObject("lastMessage") ?: continue
                    val msgId = lm.optString("id", "")
                    val msgTs = lm.optLong("ts", 0L)
                    if (msgTs <= lastNotifTs || hasNotifiedMsgId(this, msgId)) continue

                    val senderId = lm.optString("senderId", "")
                    if (senderId.isEmpty() || senderId == myUid) continue

                    val chatType = chat.optString("type", "dm")
                    val chatName = chat.optString("name", "")
                    var senderName = "Zovio"
                    val members = chat.optJSONArray("members")
                    if (members != null) {
                        for (mIdx in 0 until members.length()) {
                            val mem = members.optJSONObject(mIdx) ?: continue
                            if (mem.optString("id") == senderId) {
                                senderName = mem.optString("name", mem.optString("username", "Zovio"))
                                break
                            }
                        }
                    }
                    if (senderName == "Zovio" && chatType == "dm" && chatName.isNotEmpty()) {
                        senderName = chatName
                    }

                    deliverMessageNotification(lm, chatType, senderName, chatName)
                }
            }
        } catch (_: Exception) {}
    }

    private fun handleIncomingCallWs(socket: WebSocket, msg: JSONObject) {
        acquireShortWakeLock()
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
        val m = envelope.optJSONObject("message") ?: return
        val chatType = envelope.optString("chatType", "dm")
        val senderName = envelope.optString("senderName", "Zovio")
        val chatName = envelope.optString("chatName", "")
        deliverMessageNotification(m, chatType, senderName, chatName)
    }

    private fun deliverMessageNotification(
        m: JSONObject,
        chatType: String,
        senderName: String,
        chatName: String
    ) {
        if (isAppInForeground) return
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(KEY_NOTIFY_ENABLED, true)) return

        val msgId = m.optString("id", "")
        val msgTs = m.optLong("ts", System.currentTimeMillis())
        if (msgId.isNotEmpty() && hasNotifiedMsgId(this, msgId)) return

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

        if (chatType == "dm" && !prefs.getBoolean(KEY_NOTIFY_DMS, true)) return
        if (chatType == "group" && !prefs.getBoolean(KEY_NOTIFY_GROUPS, true)) return

        acquireShortWakeLock()
        val showPreview = prefs.getBoolean(KEY_NOTIFY_PREVIEW, true)
        val chatId = m.optString("chatId", "")
        val isGroup = chatType == "group"

        val title = if (!showPreview) {
            "Zovio — New Encrypted Activity"
        } else if (isGroup && chatName.isNotEmpty()) {
            chatName
        } else {
            senderName
        }

        val keyVersion = m.optInt("keyVersion", 1).coerceAtLeast(1)
        val decrypted = if (showPreview && kind != "call" && m.has("iv") && m.has("ct")) {
            decryptPayload(this, chatId, m.optString("iv", ""), m.optString("ct", ""), keyVersion)
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
            "note" -> {
                val t = decrypted?.optString("title", "")?.trim() ?: ""
                if (t.isNotEmpty()) "Note: $t" else "Shared a note"
            }
            else -> {
                val txt = decrypted?.optString("text", "")?.trim() ?: ""
                if (txt.isNotEmpty()) txt else "Sent an encrypted message"
            }
        }

        val shown = showSystemNotification(
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
        if (shown) {
            markMsgNotified(this, msgId, msgTs)
        }
    }

    override fun onDestroy() {
        if (activeInstance === this) activeInstance = null
        if (netCallbackRegistered) {
            try {
                val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
                cm?.unregisterNetworkCallback(networkCallback)
            } catch (_: Exception) {}
            netCallbackRegistered = false
        }
        closeSocket()
        if (!isStopped && isBgKeepAliveEnabled(this)) {
            scheduleRestartAlarm(applicationContext, 1500L)
        }
        super.onDestroy()
    }
}
