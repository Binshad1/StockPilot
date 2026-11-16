package com.stockpilot.app.ui.widgets

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.DashPathEffect
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.util.AttributeSet
import android.view.View
import android.view.animation.LinearInterpolator
import android.widget.FrameLayout
import kotlin.math.PI
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.log10
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin

private const val AMBER = 0xFFF0A742.toInt()
private const val AMBER_DARK = 0xFF7A4F10.toInt()
private const val GREEN = 0xFF7FC88A.toInt()
private const val RED = 0xFFEF6A5B.toInt()
private const val TRACK = 0xFF222319.toInt()
private const val LINE = 0xFF34352B.toInt()

/** Compact money axis label: 1.5K, 2L (lakh), 1Cr. */
fun compactNumber(v: Float): String = when {
    v >= 10_000_000f -> "${trim(v / 10_000_000f)}Cr"
    v >= 100_000f -> "${trim(v / 100_000f)}L"
    v >= 1_000f -> "${trim(v / 1_000f)}K"
    else -> v.toInt().toString()
}

private fun trim(v: Float): String = if (v == v.toInt().toFloat()) v.toInt().toString() else String.format("%.1f", v)

/** Animated amber bars used on the login hero (the "pallet" from the web app). */
class PalletView @JvmOverloads constructor(context: Context, attrs: AttributeSet? = null) : View(context, attrs) {
    private val n = 24
    private val d = resources.displayMetrics.density
    private val seeds = FloatArray(n) { ((it * 37) % 58 + 28) / 100f }
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private var phase = 0f
    private val animator = ValueAnimator.ofFloat(0f, (2 * PI).toFloat()).apply {
        duration = 3600
        repeatCount = ValueAnimator.INFINITE
        interpolator = LinearInterpolator()
        addUpdateListener {
            phase = it.animatedValue as Float
            invalidate()
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        animator.start()
    }

    override fun onDetachedFromWindow() {
        animator.cancel()
        super.onDetachedFromWindow()
    }

    override fun onDraw(canvas: Canvas) {
        val w = width.toFloat()
        val h = height.toFloat()
        val gap = 5f * d
        val bw = (w - gap * (n - 1)) / n
        for (i in 0 until n) {
            val pulse = 0.55f + 0.45f * (0.5f + 0.5f * sin(phase + i * 0.55f))
            val bh = h * seeds[i] * pulse
            val left = i * (bw + gap)
            paint.shader = LinearGradient(0f, h - bh, 0f, h, AMBER, AMBER_DARK, Shader.TileMode.CLAMP)
            paint.alpha = 220
            canvas.drawRoundRect(RectF(left, h - bh, left + bw, h), 3f * d, 3f * d, paint)
        }
    }
}

/** Ten-segment stock meter (green / amber / red) matching the web app. */
class StockMeterView @JvmOverloads constructor(context: Context, attrs: AttributeSet? = null) : View(context, attrs) {
    private val d = resources.displayMetrics.density
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private var filled = 0
    private var color = GREEN

    fun set(stock: Int, threshold: Int) {
        val maxVal = max(max(threshold * 3, stock), 1)
        filled = min(10, ceil(stock.toFloat() / maxVal * 10f).toInt())
        color = when {
            stock <= 0 -> RED
            stock <= threshold -> AMBER
            else -> GREEN
        }
        invalidate()
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        setMeasuredDimension((68f * d).toInt(), (14f * d).toInt())
    }

    override fun onDraw(canvas: Canvas) {
        val segW = 5f * d
        val gap = 2f * d
        for (i in 0 until 10) {
            paint.color = if (i < filled) color else TRACK
            val left = i * (segW + gap)
            canvas.drawRoundRect(RectF(left, 0f, left + segW, height.toFloat()), 1.5f * d, 1.5f * d, paint)
        }
    }
}

/** Diagonal amber/black warning stripe. */
class HazardStripeView @JvmOverloads constructor(context: Context, attrs: AttributeSet? = null) : View(context, attrs) {
    private val d = resources.displayMetrics.density
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = AMBER }
    private val path = Path()

    override fun onDraw(canvas: Canvas) {
        val w = width.toFloat()
        val h = height.toFloat()
        canvas.drawColor(0xFF14120C.toInt())
        val step = 14f * d
        var x = -h
        while (x < w) {
            path.reset()
            path.moveTo(x, h)
            path.lineTo(x + h, 0f)
            path.lineTo(x + h + step / 2f, 0f)
            path.lineTo(x + step / 2f, h)
            path.close()
            canvas.drawPath(path, paint)
            x += step
        }
    }
}

/** A card container that draws small corner brackets (the "stat card" look from the web app). */
class BracketFrame @JvmOverloads constructor(context: Context, attrs: AttributeSet? = null) : FrameLayout(context, attrs) {
    private val d = resources.displayMetrics.density
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = LINE
        style = Paint.Style.STROKE
        strokeWidth = 1.5f * d
    }

    init {
        setWillNotDraw(false)
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val inset = 8f * d
        val len = 10f * d
        val w = width.toFloat()
        val h = height.toFloat()
        canvas.drawLine(inset, inset, inset + len, inset, paint)
        canvas.drawLine(inset, inset, inset, inset + len, paint)
        canvas.drawLine(w - inset, inset, w - inset - len, inset, paint)
        canvas.drawLine(w - inset, inset, w - inset, inset + len, paint)
        canvas.drawLine(inset, h - inset, inset + len, h - inset, paint)
        canvas.drawLine(inset, h - inset, inset, h - inset - len, paint)
        canvas.drawLine(w - inset, h - inset, w - inset - len, h - inset, paint)
        canvas.drawLine(w - inset, h - inset, w - inset, h - inset - len, paint)
    }
}

/** Simple bar chart: one bar per value, latest bar highlighted. */
class BarChartView @JvmOverloads constructor(context: Context, attrs: AttributeSet? = null) : View(context, attrs) {
    private val d = resources.displayMetrics.density
    private var values: List<Float> = emptyList()
    private var labels: List<String> = emptyList()
    private val barPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val gridPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFF26271F.toInt()
        style = Paint.Style.STROKE
        strokeWidth = 1f * d
        pathEffect = DashPathEffect(floatArrayOf(4f * d, 5f * d), 0f)
    }
    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFF5F6157.toInt()
        textSize = 10f * d
        typeface = Typeface.MONOSPACE
    }

    fun setData(newValues: List<Float>, newLabels: List<String>) {
        values = newValues
        labels = newLabels
        invalidate()
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        setMeasuredDimension(resolveSize((300f * d).toInt(), widthMeasureSpec), resolveSize((200f * d).toInt(), heightMeasureSpec))
    }

    private fun niceTop(maxValue: Float): Float {
        if (maxValue <= 0f) return 4f
        val raw = maxValue / 4f
        val p = 10.0.pow(floor(log10(raw.toDouble()))).toFloat()
        val n = raw / p
        val m = when {
            n <= 1f -> 1f
            n <= 2f -> 2f
            n <= 2.5f -> 2.5f
            n <= 5f -> 5f
            else -> 10f
        }
        return m * p * 4f
    }

    override fun onDraw(canvas: Canvas) {
        if (values.isEmpty()) return
        val left = 38f * d
        val right = 6f * d
        val top = 8f * d
        val bottom = 22f * d
        val iw = width - left - right
        val ih = height - top - bottom
        val topValue = niceTop(values.max())

        for (i in 0..4) {
            val y = top + ih - ih * i / 4f
            canvas.drawLine(left, y, width - right, y, gridPaint)
            textPaint.textAlign = Paint.Align.RIGHT
            canvas.drawText(compactNumber(topValue * i / 4f), left - 6f * d, y + 3.5f * d, textPaint)
        }

        val slot = iw / values.size
        val bw = min(28f * d, slot * 0.55f)
        textPaint.textAlign = Paint.Align.CENTER
        values.forEachIndexed { i, v ->
            val cx = left + slot * i + slot / 2f
            val bh = if (topValue > 0f) ih * (v / topValue) else 0f
            barPaint.color = AMBER
            barPaint.alpha = if (i == values.lastIndex) 255 else 120
            canvas.drawRoundRect(RectF(cx - bw / 2f, top + ih - bh, cx + bw / 2f, top + ih), 4f * d, 4f * d, barPaint)
            labels.getOrNull(i)?.let { canvas.drawText(it, cx, height - 6f * d, textPaint) }
        }
    }
}
