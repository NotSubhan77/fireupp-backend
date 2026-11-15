package app.zovio.mobile

import android.content.Context
import android.content.Intent
import android.graphics.*
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.text.TextUtils
import android.util.TypedValue
import android.view.*
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.core.graphics.drawable.DrawableCompat
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import kotlin.math.abs

/**
 * Floating native glass call pop-up displayed over home screen & other apps
 * matching Zovio's exact in-app PiP popup design.
 */
object ZovioFloatingPipOverlay {

    private var rootView: FrameLayout? = null
    private var wm: WindowManager? = null
    private var wmParams: WindowManager.LayoutParams? = null
    private var avatarBitmap: Bitmap? = null
    private var loadedAvatarUrl: String = ""

    private var titleTextView: TextView? = null
    private var avatarView: AvatarBadgeView? = null
    private var micBtn: FrameLayout? = null
    private var micIconView: ImageView? = null
    private var camBtn: FrameLayout? = null
    private var camIconView: ImageView? = null

    private var curTitle: String = "Zovio Call"
    private var curInitials: String = "Z"
    private var curMuted: Boolean = false
    private var curCamOff: Boolean = true

    private val mainHandler = Handler(Looper.getMainLooper())
    private val imgExecutor = Executors.newSingleThreadExecutor()

    fun isShowing(): Boolean = rootView != null

    fun updateMeta(
        context: Context,
        title: String,
        avatarUrl: String,
        initials: String,
        muted: Boolean,
        camOff: Boolean
    ) {
        curTitle = title.ifBlank { "Zovio Call" }
        curInitials = initials.ifBlank { "Z" }.take(2).uppercase()
        curMuted = muted
        curCamOff = camOff

        if (avatarUrl.isNotBlank() && avatarUrl != loadedAvatarUrl) {
            loadedAvatarUrl = avatarUrl
            imgExecutor.execute {
                val bmp = fetchCircularBitmap(avatarUrl)
                mainHandler.post {
                    avatarBitmap = bmp
                    avatarView?.setAvatar(bmp, curInitials)
                }
            }
        } else if (avatarUrl.isBlank()) {
            loadedAvatarUrl = ""
            avatarBitmap = null
        }

        mainHandler.post {
            if (rootView != null) {
                titleTextView?.text = curTitle
                avatarView?.setAvatar(avatarBitmap, curInitials)
                refreshButtonStates(context)
            }
        }
    }

    fun show(context: Context) {
        mainHandler.post {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
                return@post
            }
            if (rootView != null) {
                titleTextView?.text = curTitle
                avatarView?.setAvatar(avatarBitmap, curInitials)
                refreshButtonStates(context)
                return@post
            }

            val appCtx = context.applicationContext
            val manager = appCtx.getSystemService(Context.WINDOW_SERVICE) as WindowManager
            wm = manager

            val d = appCtx.resources.displayMetrics.density
            fun dp(v: Float): Int = (v * d).toInt()
            val screenW = appCtx.resources.displayMetrics.widthPixels
            val screenH = appCtx.resources.displayMetrics.heightPixels

            val cardW = dp(224f)
            val cardH = dp(176f)

            val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            }

            val lp = WindowManager.LayoutParams(
                cardW,
                cardH,
                overlayType,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                    WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                x = (screenW - cardW - dp(16f)).coerceAtLeast(dp(12f))
                y = (screenH - cardH - dp(124f)).coerceAtLeast(dp(80f))
            }
            wmParams = lp

            val card = FrameLayout(appCtx).apply {
                background = GradientDrawable(
                    GradientDrawable.Orientation.TOP_BOTTOM,
                    intArrayOf(0xFF1A203A.toInt(), 0xFF111526.toInt(), 0xFF0A0D18.toInt())
                ).apply {
                    cornerRadius = dp(20f).toFloat()
                    setStroke(dp(1.2f), 0x33FFFFFF)
                }
                elevation = dp(14f).toFloat()
                clipToOutline = true
            }

            // Top row: [↖] [🟢 Title] [⛶]
            val topBar = LinearLayout(appCtx).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dp(10f), dp(10f), dp(10f), 0)
            }

            val minAppBtn = makeCornerIconBtn(appCtx, dp(28f), dp(9f), isExpand = false) {
                openMainApp(appCtx, expand = false)
            }

            val titlePill = LinearLayout(appCtx).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dp(9f), dp(4f), dp(10f), dp(4f))
                background = GradientDrawable().apply {
                    setColor(0xB8181D31.toInt())
                    cornerRadius = dp(999f).toFloat()
                    setStroke(dp(1f), 0x26FFFFFF)
                }
            }
            val greenDot = View(appCtx).apply {
                background = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(0xFF10B981.toInt())
                }
            }
            titlePill.addView(greenDot, LinearLayout.LayoutParams(dp(6.5f), dp(6.5f)).apply {
                marginEnd = dp(6f)
            })
            val tv = TextView(appCtx).apply {
                text = curTitle
                setTextColor(Color.WHITE)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 11.5f)
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                maxLines = 1
                ellipsize = TextUtils.TruncateAt.END
            }
            titleTextView = tv
            titlePill.addView(tv)

            val expandBtn = makeCornerIconBtn(appCtx, dp(28f), dp(9f), isExpand = true) {
                openMainApp(appCtx, expand = true)
            }

            topBar.addView(minAppBtn, LinearLayout.LayoutParams(dp(28f), dp(28f)))
            topBar.addView(titlePill, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
                marginStart = dp(6f)
                marginEnd = dp(6f)
            })
            topBar.addView(expandBtn, LinearLayout.LayoutParams(dp(28f), dp(28f)))
            card.addView(topBar, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP))

            // Center hero avatar with gradient halo
            val hero = AvatarBadgeView(appCtx).apply {
                setAvatar(avatarBitmap, curInitials)
            }
            avatarView = hero
            card.addView(hero, FrameLayout.LayoutParams(dp(64f), dp(64f), Gravity.CENTER).apply {
                topMargin = dp(2f)
            })

            // Bottom pill dock: [Mic] [Cam] [Hang Up]
            val dock = LinearLayout(appCtx).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER
                setPadding(dp(7f), dp(5f), dp(7f), dp(5f))
                background = GradientDrawable().apply {
                    setColor(0xD6101424.toInt())
                    cornerRadius = dp(999f).toFloat()
                    setStroke(dp(1f), 0x24FFFFFF)
                }
            }

            val mIcon = ImageView(appCtx).apply { scaleType = ImageView.ScaleType.CENTER_INSIDE }
            micIconView = mIcon
            val mBtn = FrameLayout(appCtx).apply {
                addView(mIcon, FrameLayout.LayoutParams(dp(17f), dp(17f), Gravity.CENTER))
                setOnClickListener {
                    curMuted = !curMuted
                    refreshButtonStates(appCtx)
                    sendPipAction(appCtx, "mute")
                }
            }
            micBtn = mBtn

            val cIcon = ImageView(appCtx).apply { scaleType = ImageView.ScaleType.CENTER_INSIDE }
            camIconView = cIcon
            val cBtn = FrameLayout(appCtx).apply {
                addView(cIcon, FrameLayout.LayoutParams(dp(17f), dp(17f), Gravity.CENTER))
                setOnClickListener {
                    curCamOff = !curCamOff
                    refreshButtonStates(appCtx)
                    sendPipAction(appCtx, "camera")
                }
            }
            camBtn = cBtn

            val hIcon = ImageView(appCtx).apply {
                scaleType = ImageView.ScaleType.CENTER_INSIDE
                setImageDrawable(tintedVector(appCtx, R.drawable.ic_pip_hangup, Color.WHITE))
            }
            val hBtn = FrameLayout(appCtx).apply {
                background = GradientDrawable().apply {
                    setColor(0xFFEF4444.toInt())
                    cornerRadius = dp(999f).toFloat()
                }
                addView(hIcon, FrameLayout.LayoutParams(dp(18f), dp(18f), Gravity.CENTER))
                setOnClickListener {
                    sendPipAction(appCtx, "hangup")
                    hide(appCtx)
                }
            }

            dock.addView(mBtn, LinearLayout.LayoutParams(dp(34f), dp(34f)).apply { marginEnd = dp(7f) })
            dock.addView(cBtn, LinearLayout.LayoutParams(dp(34f), dp(34f)).apply { marginEnd = dp(7f) })
            dock.addView(hBtn, LinearLayout.LayoutParams(dp(42f), dp(34f)))

            card.addView(dock, FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL).apply {
                bottomMargin = dp(10f)
            })

            refreshButtonStates(appCtx)

            // Smooth drag & tap-to-open gesture on the card background
            var startX = 0
            var startY = 0
            var downRawX = 0f
            var downRawY = 0f
            var moved = false
            card.setOnTouchListener { _, ev ->
                when (ev.actionMasked) {
                    MotionEvent.ACTION_DOWN -> {
                        startX = lp.x
                        startY = lp.y
                        downRawX = ev.rawX
                        downRawY = ev.rawY
                        moved = false
                        true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        val dx = (ev.rawX - downRawX).toInt()
                        val dy = (ev.rawY - downRawY).toInt()
                        if (abs(dx) > dp(4f) || abs(dy) > dp(4f)) moved = true
                        lp.x = (startX + dx).coerceIn(dp(6f), (screenW - cardW - dp(6f)).coerceAtLeast(dp(6f)))
                        lp.y = (startY + dy).coerceIn(dp(24f), (screenH - cardH - dp(24f)).coerceAtLeast(dp(24f)))
                        try { manager.updateViewLayout(card, lp) } catch (_: Exception) {}
                        true
                    }
                    MotionEvent.ACTION_UP -> {
                        if (!moved) openMainApp(appCtx, expand = true)
                        true
                    }
                    else -> false
                }
            }

            try {
                manager.addView(card, lp)
                rootView = card
            } catch (_: Exception) {
                rootView = null
            }
        }
    }

    fun hide(context: Context? = null) {
        mainHandler.post {
            val rv = rootView ?: return@post
            try {
                wm?.removeViewImmediate(rv)
            } catch (_: Exception) {
                try { wm?.removeView(rv) } catch (_: Exception) {}
            }
            rootView = null
            titleTextView = null
            avatarView = null
            micBtn = null
            micIconView = null
            camBtn = null
            camIconView = null
        }
    }

    private fun refreshButtonStates(context: Context) {
        val d = context.resources.displayMetrics.density
        val micFill = if (curMuted) 0x3BEF4444 else 0x20FFFFFF
        val micTint = if (curMuted) 0xFFF87171.toInt() else Color.WHITE
        val micRes = if (curMuted) R.drawable.ic_pip_mic_off else R.drawable.ic_pip_mic
        micBtn?.background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(micFill)
            setStroke((1f * d).toInt().coerceAtLeast(1), if (curMuted) 0x55EF4444 else 0x26FFFFFF)
        }
        micIconView?.setImageDrawable(tintedVector(context, micRes, micTint))

        val camFill = if (curCamOff) 0x3BEF4444 else 0x20FFFFFF
        val camTint = if (curCamOff) 0xFFF87171.toInt() else Color.WHITE
        val camRes = if (curCamOff) R.drawable.ic_pip_cam_off else R.drawable.ic_pip_cam
        camBtn?.background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(camFill)
            setStroke((1f * d).toInt().coerceAtLeast(1), if (curCamOff) 0x55EF4444 else 0x26FFFFFF)
        }
        camIconView?.setImageDrawable(tintedVector(context, camRes, camTint))
    }

    private fun tintedVector(context: Context, resId: Int, tintColor: Int): android.graphics.drawable.Drawable? {
        val raw = ContextCompat.getDrawable(context, resId)?.mutate() ?: return null
        DrawableCompat.setTint(raw, tintColor)
        return raw
    }

    private fun makeCornerIconBtn(context: Context, sizePx: Int, radiusPx: Int, isExpand: Boolean, onClick: () -> Unit): FrameLayout {
        val btn = FrameLayout(context).apply {
            background = GradientDrawable().apply {
                setColor(0x18FFFFFF)
                cornerRadius = radiusPx.toFloat()
                setStroke((sizePx / 24).coerceAtLeast(1), 0x2AFFFFFF)
            }
            setOnClickListener { onClick() }
        }
        val glyph = object : View(context) {
            private val p = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.WHITE
                style = Paint.Style.STROKE
                strokeWidth = (sizePx * 0.08f).coerceAtLeast(2f)
                strokeCap = Paint.Cap.ROUND
                strokeJoin = Paint.Join.ROUND
            }
            override fun onDraw(canvas: Canvas) {
                val w = width.toFloat()
                val h = height.toFloat()
                if (isExpand) {
                    val m = w * 0.28f
                    val arm = w * 0.16f
                    canvas.drawLine(m, m, m + arm, m, p); canvas.drawLine(m, m, m, m + arm, p)
                    canvas.drawLine(w - m, m, w - m - arm, m, p); canvas.drawLine(w - m, m, w - m, m + arm, p)
                    canvas.drawLine(m, h - m, m + arm, h - m, p); canvas.drawLine(m, h - m, m, h - m - arm, p)
                    canvas.drawLine(w - m, h - m, w - m - arm, h - m, p); canvas.drawLine(w - m, h - m, w - m, h - m - arm, p)
                } else {
                    val m = w * 0.30f
                    canvas.drawLine(m, m, w - m, h - m, p)
                    canvas.drawLine(m, m, m + w * 0.22f, m, p)
                    canvas.drawLine(m, m, m, m + h * 0.22f, p)
                }
            }
        }
        btn.addView(glyph, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        return btn
    }

    private fun openMainApp(context: Context, expand: Boolean) {
        hide(context)
        val act = MainActivity.activeMainActivity
        val intent = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            if (expand) putExtra("pipExpandFullscreen", true)
        }
        context.startActivity(intent)
        if (expand && act != null) {
            mainHandler.postDelayed({ act.dispatchPipAction("expand") }, 120L)
        }
    }

    private fun sendPipAction(context: Context, action: String) {
        val act = MainActivity.activeMainActivity
        if (act != null) {
            act.dispatchPipAction(action)
        } else {
            val intent = Intent(MainActivity.ACTION_PIP_CONTROL)
                .setPackage(context.packageName)
                .putExtra(MainActivity.EXTRA_PIP_ACTION_KEY, action)
            context.sendBroadcast(intent)
        }
    }

    private fun fetchCircularBitmap(urlStr: String): Bitmap? {
        return try {
            val conn = URL(urlStr).openConnection() as HttpURLConnection
            conn.connectTimeout = 4000
            conn.readTimeout = 4000
            conn.instanceFollowRedirects = true
            conn.connect()
            val raw = BitmapFactory.decodeStream(conn.inputStream) ?: return null
            val size = minOf(raw.width, raw.height).coerceAtLeast(1)
            val out = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(out)
            val paint = Paint(Paint.ANTI_ALIAS_FLAG)
            val srcX = (raw.width - size) / 2
            val srcY = (raw.height - size) / 2
            canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint)
            paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
            canvas.drawBitmap(raw, Rect(srcX, srcY, srcX + size, srcY + size), Rect(0, 0, size, size), paint)
            out
        } catch (_: Exception) {
            null
        }
    }

    private class AvatarBadgeView(context: Context) : View(context) {
        private var bmp: Bitmap? = null
        private var initials: String = "Z"

        private val haloPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
        private val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
        private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            textAlign = Paint.Align.CENTER
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        }
        private val dotBorderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFF101424.toInt()
            style = Paint.Style.FILL
        }
        private val dotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFF10B981.toInt()
            style = Paint.Style.FILL
        }

        fun setAvatar(bitmap: Bitmap?, initText: String) {
            bmp = bitmap
            initials = initText
            invalidate()
        }

        override fun onDraw(canvas: Canvas) {
            val w = width.toFloat()
            val h = height.toFloat()
            val cx = w / 2f
            val cy = h / 2f
            val r = minOf(w, h) * 0.44f

            haloPaint.strokeWidth = r * 0.11f
            haloPaint.shader = LinearGradient(cx - r, cy - r, cx + r, cy + r, 0xFF2ED3B7.toInt(), 0xFF7C5CFF.toInt(), Shader.TileMode.CLAMP)
            canvas.drawCircle(cx, cy, r, haloPaint)

            val innerR = r * 0.84f
            val b = bmp
            if (b != null) {
                val dst = RectF(cx - innerR, cy - innerR, cx + innerR, cy + innerR)
                canvas.drawBitmap(b, null, dst, null)
            } else {
                bgPaint.shader = LinearGradient(cx - innerR, cy - innerR, cx + innerR, cy + innerR, 0xFF17192C.toInt(), 0xFF0A0C16.toInt(), Shader.TileMode.CLAMP)
                canvas.drawCircle(cx, cy, innerR, bgPaint)
                textPaint.textSize = innerR * 0.78f
                val fm = textPaint.fontMetrics
                canvas.drawText(initials, cx, cy - (fm.ascent + fm.descent) / 2f, textPaint)
            }

            // Green status dot at bottom-right matching inner popup
            val dotCx = cx + r * 0.62f
            val dotCy = cy + r * 0.62f
            val dotR = r * 0.22f
            canvas.drawCircle(dotCx, dotCy, dotR + r * 0.07f, dotBorderPaint)
            canvas.drawCircle(dotCx, dotCy, dotR, dotPaint)
        }
    }
}
