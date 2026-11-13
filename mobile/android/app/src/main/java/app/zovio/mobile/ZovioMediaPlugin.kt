package app.zovio.mobile

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.AudioManager
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import android.util.Base64
import androidx.activity.result.ActivityResult
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
