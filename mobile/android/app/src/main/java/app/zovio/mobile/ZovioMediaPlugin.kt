package app.zovio.mobile

import android.Manifest
import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import android.util.Base64
import androidx.activity.result.ActivityResult
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer

@CapacitorPlugin(
    name = "ZovioMedia",
    permissions = [
        Permission(strings = [Manifest.permission.RECORD_AUDIO], alias = "audio"),
        Permission(strings = [Manifest.permission.CAMERA], alias = "camera"),
        Permission(strings = [Manifest.permission.POST_NOTIFICATIONS], alias = "notifications")
    ]
)
class ZovioMediaPlugin : Plugin() {

    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private var projectionThread: HandlerThread? = null
    private var projectionHandler: Handler? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    private var shareWidth = 720
    private var shareHeight = 1280
    private var shareFps = 20
    private var lastFrameMs = 0L

    @PluginMethod
    fun ensurePermissions(call: PluginCall) {
        val needCamera = call.getBoolean("video", false) ?: false
        val missingAliases = mutableListOf<String>()
        if (getPermissionState("audio") != PermissionState.GRANTED) {
            missingAliases.add("audio")
        }
        if (needCamera && getPermissionState("camera") != PermissionState.GRANTED) {
            missingAliases.add("camera")
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            getPermissionState("notifications") != PermissionState.GRANTED
        ) {
            missingAliases.add("notifications")
        }
        if (missingAliases.isEmpty()) {
            call.resolve(JSObject().put("granted", true))
            return
        }
        requestPermissionForAliases(missingAliases.toTypedArray(), call, "onMediaPermissionsResult")
    }

    @PermissionCallback
    private fun onMediaPermissionsResult(call: PluginCall) {
        val audioOk = getPermissionState("audio") == PermissionState.GRANTED
        val needCamera = call.getBoolean("video", false) ?: false
        val camOk = !needCamera || getPermissionState("camera") == PermissionState.GRANTED
        call.resolve(JSObject().put("granted", audioOk && camOk))
    }

    @PluginMethod
    fun startCallService(call: PluginCall) {
        val intent = Intent(context, ZovioCallService::class.java).apply {
            action = ZovioCallService.ACTION_START_CALL
            putExtra(ZovioCallService.EXTRA_TITLE, call.getString("title", "Zovio Call"))
            putExtra(ZovioCallService.EXTRA_VIDEO, call.getBoolean("video", false) ?: false)
        }
        ContextCompat.startForegroundService(context, intent)
        call.resolve(JSObject().put("ok", true))
    }

    @PluginMethod
    fun stopCallService(call: PluginCall) {
        stopProjectionInternal()
        val intent = Intent(context, ZovioCallService::class.java).apply {
            action = ZovioCallService.ACTION_STOP_CALL
        }
        context.startService(intent)
        call.resolve(JSObject().put("ok", true))
    }

    @PluginMethod
    fun setSpeakerphone(call: PluginCall) {
        val enabled = call.getBoolean("enabled", true) ?: true
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        am.mode = AudioManager.MODE_IN_COMMUNICATION
        am.isSpeakerphoneOn = enabled
        call.resolve(JSObject().put("speaker", enabled))
    }

    @PluginMethod
    fun getAudioRoutes(call: PluginCall) {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        var hasBluetooth = false
        var hasHeadset = false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val devs = am.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
            for (d in devs) {
                when (d.type) {
                    AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
                    AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
                    AudioDeviceInfo.TYPE_BLE_HEADSET -> hasBluetooth = true
                    AudioDeviceInfo.TYPE_WIRED_HEADSET,
                    AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
                    AudioDeviceInfo.TYPE_USB_HEADSET -> hasHeadset = true
                }
            }
        }
        call.resolve(
            JSObject()
                .put("speaker", am.isSpeakerphoneOn)
                .put("hasBluetooth", hasBluetooth)
                .put("hasHeadset", hasHeadset)
        )
    }

    @PluginMethod
    fun requestNotificationPermission(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            getPermissionState("notifications") != PermissionState.GRANTED
        ) {
            requestPermissionForAlias("notifications", call, "onNotifPermissionResult")
            return
        }
        call.resolve(JSObject().put("granted", true))
    }

    @PermissionCallback
    private fun onNotifPermissionResult(call: PluginCall) {
        val granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            getPermissionState("notifications") == PermissionState.GRANTED
        call.resolve(JSObject().put("granted", granted))
    }

    @PluginMethod
    fun showNotification(call: PluginCall) {
        val title = call.getString("title", "Zovio") ?: "Zovio"
        val body = call.getString("body", "") ?: ""
        val chatId = call.getString("chatId", "") ?: ""
        val tag = call.getString("tag", chatId.ifEmpty { "zovio" }) ?: "zovio"
        val category = call.getString("category", "") ?: ""
        val silent = call.getBoolean("silent", false) ?: false

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            call.resolve(JSObject().put("shown", false).put("reason", "permission_denied"))
            return
        }

        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = if (silent) "zovio_alerts_silent_v2" else "zovio_alerts_v2"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (nm.getNotificationChannel(channelId) == null) {
                val ch = NotificationChannel(
                    channelId,
                    if (silent) "Silent Messages" else "Messages & Calls",
                    if (silent) NotificationManager.IMPORTANCE_LOW else NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Zovio encrypted messages and incoming calls"
                    enableVibration(!silent)
                    if (silent) setSound(null, null)
                }
                nm.createNotificationChannel(ch)
            }
        }

        val tapIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
            if (chatId.isNotEmpty()) putExtra("chatId", chatId)
        }
        val reqCode = (tag.hashCode() and 0x7fffffff).coerceAtLeast(1)
        val piFlags = PendingIntent.FLAG_UPDATE_CURRENT or
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        val pendingIntent = PendingIntent.getActivity(context, reqCode, tapIntent, piFlags)

        val isCall = category == "call"
        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setCategory(if (isCall) NotificationCompat.CATEGORY_CALL else NotificationCompat.CATEGORY_MESSAGE)
            .setPriority(
                if (silent) NotificationCompat.PRIORITY_LOW
                else if (isCall) NotificationCompat.PRIORITY_MAX
                else NotificationCompat.PRIORITY_HIGH
            )
            .setSilent(silent)

        try {
            NotificationManagerCompat.from(context).notify(tag, reqCode, builder.build())
            call.resolve(JSObject().put("shown", true))
        } catch (e: Exception) {
            call.resolve(JSObject().put("shown", false).put("reason", e.message ?: "notify_failed"))
        }
    }

    @PluginMethod
    fun startScreenShare(call: PluginCall) {
        val reqW = (call.getInt("maxWidth", 720) ?: 720).coerceIn(360, 1280)
        val reqH = (call.getInt("maxHeight", 1280) ?: 1280).coerceIn(480, 1280)
        val reqFps = (call.getInt("fps", 20) ?: 20).coerceIn(8, 30)

        val metrics = context.resources.displayMetrics
        val aspect = metrics.heightPixels.toFloat() / metrics.widthPixels.coerceAtLeast(1).toFloat()
        shareWidth = reqW
        shareHeight = (reqW * aspect).toInt().coerceIn(480, reqH)
        shareFps = reqFps

        val mgr = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        val intent = mgr.createScreenCaptureIntent()
        startActivityForResult(call, intent, "onScreenCaptureResult")
    }

    @ActivityCallback
    private fun onScreenCaptureResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        if (result.resultCode != Activity.RESULT_OK || result.data == null) {
            call.resolve(JSObject().put("ok", false).put("error", "Screen capture permission denied"))
            return
        }

        // Android 14+ requires starting foreground service with mediaProjection type BEFORE getMediaProjection
        val fgIntent = Intent(context, ZovioCallService::class.java).apply {
            action = ZovioCallService.ACTION_ENABLE_SCREEN_SHARE
            putExtra(ZovioCallService.EXTRA_TITLE, "Zovio Screen Share")
            putExtra(ZovioCallService.EXTRA_SCREEN_SHARE, true)
        }
        ContextCompat.startForegroundService(context, fgIntent)

        mainHandler.postDelayed({
            try {
                stopProjectionInternal()
                val mgr = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
                mediaProjection = mgr.getMediaProjection(result.resultCode, result.data!!)
                if (mediaProjection == null) {
                    call.resolve(JSObject().put("ok", false).put("error", "MediaProjection initialization failed"))
                    return@postDelayed
                }

                projectionThread = HandlerThread("ZovioScreenProjection").apply { start() }
                projectionHandler = Handler(projectionThread!!.looper)

                mediaProjection?.registerCallback(object : MediaProjection.Callback() {
                    override fun onStop() {
                        stopProjectionInternal()
                    }
                }, projectionHandler)

                imageReader = ImageReader.newInstance(shareWidth, shareHeight, PixelFormat.RGBA_8888, 2)
                val minFrameIntervalMs = (1000L / shareFps).coerceAtLeast(30L)
                lastFrameMs = 0L

                imageReader?.setOnImageAvailableListener({ reader ->
                    val img = reader.acquireLatestImage() ?: return@setOnImageAvailableListener
                    try {
                        val now = System.currentTimeMillis()
                        if (now - lastFrameMs < minFrameIntervalMs) {
                            img.close()
                            return@setOnImageAvailableListener
                        }
                        lastFrameMs = now

                        val plane = img.planes[0]
                        val buffer: ByteBuffer = plane.buffer
                        val pixelStride = plane.pixelStride
                        val rowStride = plane.rowStride
                        val rowPadding = rowStride - pixelStride * shareWidth

                        val rawBmp = Bitmap.createBitmap(
                            shareWidth + rowPadding / pixelStride,
                            shareHeight,
                            Bitmap.Config.ARGB_8888
                        )
                        rawBmp.copyPixelsFromBuffer(buffer)
                        val cropped = Bitmap.createBitmap(rawBmp, 0, 0, shareWidth, shareHeight)
                        rawBmp.recycle()

                        val baos = ByteArrayOutputStream()
                        cropped.compress(Bitmap.CompressFormat.JPEG, 60, baos)
                        cropped.recycle()

                        val b64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)
                        val dataUrl = "data:image/jpeg;base64,$b64"
                        val quoted = JSONObject.quote(dataUrl)

                        mainHandler.post {
                            bridge?.webView?.evaluateJavascript(
                                "window.__zovioAndroidScreenFrame && window.__zovioAndroidScreenFrame($quoted);",
                                null
                            )
                        }
                    } catch (_: Exception) {
                    } finally {
                        try { img.close() } catch (_: Exception) {}
                    }
                }, projectionHandler)

                val densityDpi = context.resources.displayMetrics.densityDpi
                virtualDisplay = mediaProjection?.createVirtualDisplay(
                    "ZovioScreenShare",
                    shareWidth,
                    shareHeight,
                    densityDpi,
                    DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                    imageReader?.surface,
                    null,
                    projectionHandler
                )

                call.resolve(
                    JSObject()
                        .put("ok", true)
                        .put("width", shareWidth)
                        .put("height", shareHeight)
                )
            } catch (e: Exception) {
                stopProjectionInternal()
                call.resolve(JSObject().put("ok", false).put("error", e.message ?: "Projection failed"))
            }
        }, 120L)
    }

    @PluginMethod
    fun stopScreenShare(call: PluginCall) {
        stopProjectionInternal()
        val intent = Intent(context, ZovioCallService::class.java).apply {
            action = ZovioCallService.ACTION_DISABLE_SCREEN_SHARE
        }
        try { context.startService(intent) } catch (_: Exception) {}
        call.resolve(JSObject().put("ok", true))
    }

    @PluginMethod
    fun scanQr(call: PluginCall) {
        val intent = Intent(context, QrScannerActivity::class.java)
        startActivityForResult(call, intent, "onQrScanResult")
    }

    @PluginMethod
    fun openAuthBrowser(call: PluginCall) {
        val url = call.getString("url")?.trim()
        if (url.isNullOrEmpty() || !url.startsWith("https://")) {
            call.reject("Valid HTTPS URL required")
            return
        }
        val act = activity
        if (act == null) {
            call.reject("Activity unavailable")
            return
        }
        act.runOnUiThread {
            try {
                val uri = Uri.parse(url)
                val tabs = CustomTabsIntent.Builder()
                    .setShowTitle(true)
                    .build()
                tabs.launchUrl(act, uri)
                call.resolve(JSObject().put("ok", true))
            } catch (_: Exception) {
                try {
                    val viewIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    act.startActivity(viewIntent)
                    call.resolve(JSObject().put("ok", true))
                } catch (e: Exception) {
                    call.reject(e.message ?: "Failed to open external browser")
                }
            }
        }
    }

    @ActivityCallback
    private fun onQrScanResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        if (result.resultCode == Activity.RESULT_OK) {
            val raw = result.data?.getStringExtra(QrScannerActivity.EXTRA_QR_VALUE)
            call.resolve(JSObject().put("rawValue", raw))
        } else {
            call.resolve(JSObject().put("rawValue", null))
        }
    }

    private fun stopProjectionInternal() {
        try { virtualDisplay?.release() } catch (_: Exception) {}
        virtualDisplay = null
        try { imageReader?.close() } catch (_: Exception) {}
        imageReader = null
        try { mediaProjection?.stop() } catch (_: Exception) {}
        mediaProjection = null
        try { projectionThread?.quitSafely() } catch (_: Exception) {}
        projectionThread = null
        projectionHandler = null
    }

    override fun handleOnDestroy() {
        stopProjectionInternal()
        super.handleOnDestroy()
    }
}
