package app.zovio.mobile

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.util.Size
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.annotation.OptIn
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.FocusMeteringAction
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.google.zxing.BinaryBitmap
import com.google.zxing.DecodeHintType
import com.google.zxing.PlanarYUVLuminanceSource
import com.google.zxing.common.GlobalHistogramBinarizer
import com.google.zxing.common.HybridBinarizer
import com.google.zxing.qrcode.QRCodeReader
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

class QrScannerActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_QR_VALUE = "qrValue"
        const val EXTRA_ERROR = "scanError"
        private const val REQ_CAMERA = 301
        private const val TAG = "ZovioQR"
    }

    private lateinit var previewView: PreviewView
    private lateinit var statusLabel: TextView
    private lateinit var torchBtn: Button
    private lateinit var cameraExecutor: ExecutorService
    private val mainHandler = Handler(Looper.getMainLooper())
    private var activeCamera: Camera? = null
    private var torchEnabled = false
    private val handled = AtomicBoolean(false)
    private val frameCounter = AtomicInteger(0)
    private val zxingReader = QRCodeReader()
    private val zxingHints: Map<DecodeHintType, Any> = mapOf(
        DecodeHintType.TRY_HARDER to true,
        DecodeHintType.CHARACTER_SET to "UTF-8"
    )
    private val focusRunnable = object : Runnable {
        override fun run() {
            if (handled.get() || isFinishing || isDestroyed) return
            triggerCenterFocus()
            mainHandler.postDelayed(this, 2400L)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        cameraExecutor = Executors.newSingleThreadExecutor()

        val root = FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)
        }

        previewView = PreviewView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            scaleType = PreviewView.ScaleType.FILL_CENTER
        }
        root.addView(previewView)

        val dp = { value: Int ->
            TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                value.toFloat(),
                resources.displayMetrics
            ).toInt()
        }

        val frameSize = dp(264)
        val finder = View(this).apply {
            isClickable = false
            isFocusable = false
            layoutParams = FrameLayout.LayoutParams(frameSize, frameSize).apply {
                gravity = Gravity.CENTER
            }
            background = GradientDrawable().apply {
                setColor(Color.TRANSPARENT)
                setStroke(dp(3), Color.parseColor("#7C5CFF"))
                cornerRadius = dp(24).toFloat()
            }
        }
        root.addView(finder)

        val title = TextView(this).apply {
            text = "Scan Zovio Desktop QR Code"
            setTextColor(Color.WHITE)
            textSize = 17f
            setPadding(dp(20), dp(14), dp(20), dp(14))
            gravity = Gravity.CENTER
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
                topMargin = dp(56)
            }
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#99000000"))
                cornerRadius = dp(99).toFloat()
            }
        }
        root.addView(title)

        statusLabel = TextView(this).apply {
            text = "Point camera at the QR code on Zovio Desktop"
            setTextColor(Color.parseColor("#E2E8F0"))
            textSize = 13f
            setPadding(dp(16), dp(8), dp(16), dp(8))
            gravity = Gravity.CENTER
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
                bottomMargin = dp(112)
            }
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#AA000000"))
                cornerRadius = dp(99).toFloat()
            }
        }
        root.addView(statusLabel)

        val btnRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
                bottomMargin = dp(44)
            }
        }

        torchBtn = Button(this).apply {
            text = "Flash"
            visibility = View.GONE
            setTextColor(Color.WHITE)
            setPadding(dp(22), dp(12), dp(22), dp(12))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                marginEnd = dp(12)
            }
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#CC1A1B20"))
                setStroke(dp(1), Color.parseColor("#44FFFFFF"))
                cornerRadius = dp(99).toFloat()
            }
            setOnClickListener {
                val cam = activeCamera ?: return@setOnClickListener
                if (cam.cameraInfo.hasFlashUnit()) {
                    torchEnabled = !torchEnabled
                    cam.cameraControl.enableTorch(torchEnabled)
                    text = if (torchEnabled) "Flash On" else "Flash"
                }
            }
        }
        btnRow.addView(torchBtn)

        val cancelBtn = Button(this).apply {
            text = "Cancel"
            setTextColor(Color.WHITE)
            setPadding(dp(28), dp(12), dp(28), dp(12))
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#CC1A1B20"))
                setStroke(dp(1), Color.parseColor("#44FFFFFF"))
                cornerRadius = dp(99).toFloat()
            }
            setOnClickListener {
                setResult(Activity.RESULT_CANCELED)
                finish()
            }
        }
        btnRow.addView(cancelBtn)
        root.addView(btnRow)

        setContentView(root)

        previewView.setOnTouchListener { _, event ->
            if (event.action == MotionEvent.ACTION_UP) {
                val cam = activeCamera
                if (cam != null) {
                    val point = previewView.meteringPointFactory.createPoint(event.x, event.y)
                    val action = FocusMeteringAction.Builder(point, FocusMeteringAction.FLAG_AF or FocusMeteringAction.FLAG_AE)
                        .setAutoCancelDuration(3, TimeUnit.SECONDS)
                        .build()
                    cam.cameraControl.startFocusAndMetering(action)
                }
            }
            true
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            startCamera()
        } else {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), REQ_CAMERA)
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQ_CAMERA && grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            startCamera()
        } else {
            setResult(Activity.RESULT_CANCELED, Intent().putExtra(EXTRA_ERROR, "Camera permission is required to scan QR codes"))
            finish()
        }
    }

    @OptIn(ExperimentalGetImage::class)
    private fun startCamera() {
        val providerFuture = ProcessCameraProvider.getInstance(this)
        val scanner = BarcodeScanning.getClient(
            BarcodeScannerOptions.Builder()
                .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                .build()
        )

        providerFuture.addListener({
            val cameraProvider = providerFuture.get()
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(previewView.surfaceProvider)
            }

            val resolutionSelector = ResolutionSelector.Builder()
                .setResolutionStrategy(
                    ResolutionStrategy(
                        Size(1280, 720),
                        ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER
                    )
                )
                .build()

            val analysis = ImageAnalysis.Builder()
                .setResolutionSelector(resolutionSelector)
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()

            analysis.setAnalyzer(cameraExecutor) { imageProxy ->
                if (handled.get()) {
                    imageProxy.close()
                    return@setAnalyzer
                }
                val frameIdx = frameCounter.getAndIncrement()
                if (frameIdx == 0) {
                    val p0 = imageProxy.planes.firstOrNull()
                    Log.d(
                        TAG,
                        "First camera frame: ${imageProxy.width}x${imageProxy.height} rot=${imageProxy.imageInfo.rotationDegrees} fmt=${imageProxy.format} stride=${p0?.rowStride}"
                    )
                }

                // Alternate ML Kit and pure-Java ZXing on every frame so neither engine can stall CameraX
                if (frameIdx % 2 == 1) {
                    val width = imageProxy.width
                    val height = imageProxy.height
                    val luma = extractLumaBytes(imageProxy)
                    imageProxy.close()
                    if (luma != null) {
                        val decoded = decodeWithZxing(luma, width, height)
                        if (!decoded.isNullOrBlank()) {
                            deliverQrResult(decoded, "zxing")
                        }
                    }
                    return@setAnalyzer
                }

                val mediaImage = imageProxy.image
                if (mediaImage != null) {
                    val img = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
                    scanner.process(img)
                        .addOnSuccessListener { barcodes ->
                            val raw = barcodes.firstOrNull { !it.rawValue.isNullOrBlank() }?.rawValue
                            if (!raw.isNullOrBlank()) {
                                deliverQrResult(raw, "mlkit")
                            }
                        }
                        .addOnFailureListener { err ->
                            if (frameIdx < 10) {
                                Log.w(TAG, "MLKit error: ${err.message}", err)
                            }
                            runOnUiThread {
                                statusLabel.text = err.localizedMessage ?: "Adjust distance or lighting to scan QR"
                            }
                        }
                        .addOnCompleteListener {
                            imageProxy.close()
                        }
                } else {
                    imageProxy.close()
                }
            }

            try {
                cameraProvider.unbindAll()
                val camera = cameraProvider.bindToLifecycle(
                    this,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    analysis
                )
                activeCamera = camera
                Log.d(TAG, "CameraX bound cleanly; hasFlash=${camera.cameraInfo.hasFlashUnit()}")
                if (camera.cameraInfo.hasFlashUnit()) {
                    torchBtn.visibility = View.VISIBLE
                }
                previewView.post {
                    triggerCenterFocus()
                    mainHandler.removeCallbacks(focusRunnable)
                    mainHandler.postDelayed(focusRunnable, 2400L)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Camera bind failed", e)
                setResult(Activity.RESULT_CANCELED, Intent().putExtra(EXTRA_ERROR, e.localizedMessage ?: "Camera unavailable"))
                finish()
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun triggerCenterFocus() {
        val cam = activeCamera ?: return
        if (!::previewView.isInitialized || previewView.width <= 0 || previewView.height <= 0) return
        try {
            val centerPoint = previewView.meteringPointFactory.createPoint(
                previewView.width * 0.5f,
                previewView.height * 0.5f
            )
            val focusAction = FocusMeteringAction.Builder(
                centerPoint,
                FocusMeteringAction.FLAG_AF or FocusMeteringAction.FLAG_AE
            )
                .setAutoCancelDuration(3, TimeUnit.SECONDS)
                .build()
            cam.cameraControl.startFocusAndMetering(focusAction)
        } catch (_: Exception) {}
    }

    private fun deliverQrResult(raw: String, engine: String) {
        if (!handled.compareAndSet(false, true)) return
        Log.d(TAG, "QR decoded via $engine (len=${raw.length})")
        mainHandler.removeCallbacks(focusRunnable)
        runOnUiThread {
            val data = Intent().putExtra(EXTRA_QR_VALUE, raw)
            setResult(Activity.RESULT_OK, data)
            finish()
        }
    }

    private fun extractLumaBytes(image: ImageProxy): ByteArray? {
        val plane = image.planes.firstOrNull() ?: return null
        val w = image.width
        val h = image.height
        if (w <= 0 || h <= 0) return null
        val rowStride = plane.rowStride
        val pixelStride = plane.pixelStride
        val buf = plane.buffer
        val origPos = buf.position()
        val out = ByteArray(w * h)
        return try {
            if (pixelStride == 1 && rowStride == w) {
                buf.rewind()
                buf.get(out, 0, minOf(out.size, buf.remaining()))
            } else {
                val rowBuf = ByteArray(rowStride)
                for (r in 0 until h) {
                    buf.position(r * rowStride)
                    val toRead = minOf(rowStride, buf.remaining())
                    if (toRead <= 0) break
                    buf.get(rowBuf, 0, toRead)
                    val dstOffset = r * w
                    if (pixelStride == 1) {
                        System.arraycopy(rowBuf, 0, out, dstOffset, minOf(w, toRead))
                    } else {
                        var srcIdx = 0
                        for (c in 0 until w) {
                            out[dstOffset + c] = if (srcIdx < toRead) rowBuf[srcIdx] else 0
                            srcIdx += pixelStride
                        }
                    }
                }
            }
            out
        } catch (e: Exception) {
            Log.w(TAG, "extractLumaBytes failed: ${e.message}")
            null
        } finally {
            try {
                buf.position(origPos)
            } catch (_: Exception) {}
        }
    }

    private fun tryDecodeZxingSource(source: com.google.zxing.LuminanceSource): String? {
        try {
            val res = zxingReader.decode(BinaryBitmap(HybridBinarizer(source)), zxingHints)
            if (!res.text.isNullOrBlank()) return res.text
        } catch (_: Exception) {
        } finally {
            zxingReader.reset()
        }
        try {
            val res = zxingReader.decode(BinaryBitmap(GlobalHistogramBinarizer(source)), zxingHints)
            if (!res.text.isNullOrBlank()) return res.text
        } catch (_: Exception) {
        } finally {
            zxingReader.reset()
        }
        return null
    }

    private fun decodeWithZxing(luma: ByteArray, width: Int, height: Int): String? {
        val fullSource = PlanarYUVLuminanceSource(luma, width, height, 0, 0, width, height, false)
        tryDecodeZxingSource(fullSource)?.let { return it }

        val minDim = minOf(width, height)
        val cropSize = (minDim * 0.72f).toInt().coerceAtLeast(120).coerceAtMost(minDim)
        val left = (width - cropSize) / 2
        val top = (height - cropSize) / 2
        val cropSource = PlanarYUVLuminanceSource(luma, width, height, left, top, cropSize, cropSize, false)
        tryDecodeZxingSource(cropSource)?.let { return it }

        try {
            val inv = cropSource.invert()
            val res = zxingReader.decode(BinaryBitmap(HybridBinarizer(inv)), zxingHints)
            if (!res.text.isNullOrBlank()) return res.text
        } catch (_: Exception) {
        } finally {
            zxingReader.reset()
        }
        return null
    }

    override fun onDestroy() {
        super.onDestroy()
        mainHandler.removeCallbacks(focusRunnable)
        if (::cameraExecutor.isInitialized) {
            cameraExecutor.shutdown()
        }
    }
}
