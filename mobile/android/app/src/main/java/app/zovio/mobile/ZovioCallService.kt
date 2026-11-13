package app.zovio.mobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat

class ZovioCallService : Service() {

    companion object {
        const val CHANNEL_ID = "zovio_calls"
        const val NOTIFICATION_ID = 4102
        const val ACTION_START_CALL = "app.zovio.mobile.START_CALL"
        const val ACTION_STOP_CALL = "app.zovio.mobile.STOP_CALL"
        const val ACTION_ENABLE_SCREEN_SHARE = "app.zovio.mobile.ENABLE_SCREEN_SHARE"
        const val ACTION_DISABLE_SCREEN_SHARE = "app.zovio.mobile.DISABLE_SCREEN_SHARE"
        const val EXTRA_TITLE = "title"
        const val EXTRA_VIDEO = "video"
        const val EXTRA_SCREEN_SHARE = "screenShare"
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private var audioManager: AudioManager? = null
    private var audioFocusRequest: AudioFocusRequest? = null
    private var isScreenShareActive = false
    private var isVideoActive = false
    private var currentTitle = "Zovio Call"

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        ensureNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP_CALL -> {
                releaseMediaResources()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_ENABLE_SCREEN_SHARE -> {
                isScreenShareActive = true
                if (intent.hasExtra(EXTRA_TITLE)) {
                    currentTitle = intent.getStringExtra(EXTRA_TITLE) ?: currentTitle
                }
            }
            ACTION_DISABLE_SCREEN_SHARE -> {
                isScreenShareActive = false
            }
            else -> {
                currentTitle = intent?.getStringExtra(EXTRA_TITLE) ?: currentTitle
                isVideoActive = intent?.getBooleanExtra(EXTRA_VIDEO, false) ?: isVideoActive
                if (intent?.hasExtra(EXTRA_SCREEN_SHARE) == true) {
                    isScreenShareActive = intent.getBooleanExtra(EXTRA_SCREEN_SHARE, false)
                }
            }
        }

        acquireMediaResources()
        promoteForeground()
        return START_NOT_STICKY
    }

    private fun ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(NotificationManager::class.java)
            val ch = NotificationChannel(
                CHANNEL_ID,
                "Zovio Calls & Screen Share",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps encrypted voice, video, and screen sharing active"
                setShowBadge(false)
            }
            nm.createNotificationChannel(ch)
        }
    }

    private fun buildNotification(): Notification {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pi = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val statusText = when {
            isScreenShareActive -> "Sharing screen · E2E encrypted"
            isVideoActive -> "Video call in progress · Tap to return"
            else -> "Voice call active · Tap to return"
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_zovio)
            .setContentTitle(currentTitle)
            .setContentText(statusText)
            .setContentIntent(pi)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun promoteForeground() {
        val notif = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            var fgType = ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            if (isVideoActive && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                fgType = fgType or ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA
            }
            if (isScreenShareActive) {
                fgType = fgType or ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
            }
            startForeground(NOTIFICATION_ID, notif, fgType)
        } else {
            startForeground(NOTIFICATION_ID, notif)
        }
    }

    private fun acquireMediaResources() {
        if (wakeLock == null) {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Zovio:CallWakeLock").apply {
                setReferenceCounted(false)
                acquire(6 * 60 * 60 * 1000L)
            }
        }
        audioManager?.let { am ->
            am.mode = AudioManager.MODE_IN_COMMUNICATION
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest == null) {
                val attrs = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
                audioFocusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
                    .setAudioAttributes(attrs)
                    .setOnAudioFocusChangeListener { }
                    .setAcceptsDelayedFocusGain(true)
                    .build()
                am.requestAudioFocus(audioFocusRequest!!)
            }
        }
    }

    private fun releaseMediaResources() {
        try {
            if (wakeLock?.isHeld == true) wakeLock?.release()
        } catch (_: Exception) {}
        wakeLock = null

        audioManager?.let { am ->
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    audioFocusRequest?.let { am.abandonAudioFocusRequest(it) }
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    try { am.clearCommunicationDevice() } catch (_: Exception) {}
                }
                try {
                    @Suppress("DEPRECATION")
                    if (am.isBluetoothScoOn) {
                        am.stopBluetoothSco()
                        am.isBluetoothScoOn = false
                    }
                } catch (_: Exception) {}
                am.isSpeakerphoneOn = false
                am.mode = AudioManager.MODE_NORMAL
            } catch (_: Exception) {}
        }
        audioFocusRequest = null
    }

    override fun onDestroy() {
        releaseMediaResources()
        super.onDestroy()
    }
}
