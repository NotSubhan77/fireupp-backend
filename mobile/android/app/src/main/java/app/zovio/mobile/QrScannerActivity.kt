package app.zovio.mobile

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.FrameLayout
import android.widget.TextView
import androidx.annotation.OptIn
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class QrScannerActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_QR_VALUE = "qrValue"
        private const val REQ_CAMERA = 301
    }

    private lateinit var previewView: PreviewView
    private lateinit var cameraExecutor: ExecutorService
    private val handled = AtomicBoolean(false)

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

        val frameSize = dp(250)
        val finder = View(this).apply {
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

        val cancelBtn = Button(this).apply {
            text = "Cancel"
            setTextColor(Color.WHITE)
            setPadding(dp(28), dp(12), dp(28), dp(12))
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
                bottomMargin = dp(48)
            }
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
        root.addView(cancelBtn)

        setContentView(root)

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
            setResult(Activity.RESULT_CANCELED)
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

            val analysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()

            analysis.setAnalyzer(cameraExecutor) { imageProxy ->
                val mediaImage = imageProxy.image
                if (mediaImage != null && !handled.get()) {
                    val img = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
                    scanner.process(img)
                        .addOnSuccessListener { barcodes ->
                            val raw = barcodes.firstOrNull { !it.rawValue.isNullOrBlank() }?.rawValue
                            if (!raw.isNullOrBlank() && handled.compareAndSet(false, true)) {
                                runOnUiThread {
                                    val data = Intent().putExtra(EXTRA_QR_VALUE, raw)
                                    setResult(Activity.RESULT_OK, data)
                                    finish()
                                }
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
                cameraProvider.bindToLifecycle(
                    this,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    analysis
                )
            } catch (_: Exception) {
                setResult(Activity.RESULT_CANCELED)
                finish()
            }
        }, ContextCompat.getMainExecutor(this))
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::cameraExecutor.isInitialized) {
            cameraExecutor.shutdown()
        }
    }
}
