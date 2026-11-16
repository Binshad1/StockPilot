package com.stockpilot.app.ui

import android.content.res.ColorStateList
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.android.material.chip.Chip
import com.stockpilot.app.R
import com.stockpilot.app.data.InventoryReport
import com.stockpilot.app.data.Net
import com.stockpilot.app.data.SalesDay
import com.stockpilot.app.data.SalesReport
import com.stockpilot.app.data.Session
import com.stockpilot.app.databinding.ActivityReportsBinding
import com.stockpilot.app.databinding.ItemBarBinding
import com.stockpilot.app.databinding.ItemPanelBinding
import com.stockpilot.app.databinding.ItemRowBinding
import com.stockpilot.app.databinding.ItemStatBinding
import com.stockpilot.app.ui.widgets.BarChartView
import kotlinx.coroutines.launch
import java.time.LocalDate

/** Admin only: sales and inventory reports. */
class ReportsActivity : AppCompatActivity() {

    private lateinit var b: ActivityReportsBinding
    private var salesTab = true
    private var days = 30

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (!Session.isAdmin(this)) { // never show this screen to staff
            finish()
            return
        }
        b = ActivityReportsBinding.inflate(layoutInflater)
        setContentView(b.root)
        b.btnBack.setOnClickListener { finish() }

        b.toggleTab.addOnButtonCheckedListener { _, id, isChecked ->
            if (isChecked) {
                salesTab = id == b.btnSales.id
                b.rangeScroll.visibility = if (salesTab) View.VISIBLE else View.GONE
                load()
            }
        }
        buildRangeChips()
        b.swipe.setOnRefreshListener { load() }
        b.toggleTab.check(b.btnSales.id)
    }

    private fun buildRangeChips() {
        val checked = intArrayOf(android.R.attr.state_checked)
        val none = intArrayOf()
        val bg = ColorStateList(arrayOf(checked, none), intArrayOf(ContextCompat.getColor(this, R.color.amber), ContextCompat.getColor(this, R.color.surface2)))
        val fg = ColorStateList(arrayOf(checked, none), intArrayOf(ContextCompat.getColor(this, R.color.amber_ink), ContextCompat.getColor(this, R.color.muted)))
        listOf("7 days" to 7, "30 days" to 30, "90 days" to 90).forEach { (label, n) ->
            val chip = Chip(this).apply {
                text = label
                id = View.generateViewId()
                isCheckable = true
                isCheckedIconVisible = false
                chipBackgroundColor = bg
                setTextColor(fg)
                chipStrokeColor = ColorStateList.valueOf(ContextCompat.getColor(this@ReportsActivity, R.color.line2))
                chipStrokeWidth = dp(1).toFloat()
            }
            chip.setOnClickListener {
                days = n
                load()
            }
            b.ranges.addView(chip)
            if (n == days) chip.isChecked = true
        }
    }

    private fun load() {
        b.swipe.isRefreshing = true
        lifecycleScope.launch {
            try {
                val api = Net.api(this@ReportsActivity)
                if (salesTab) {
                    val to = LocalDate.now()
                    renderSales(api.salesReport(to.minusDays((days - 1).toLong()).toString(), to.toString()))
                } else {
                    renderInventory(api.inventoryReport())
                }
            } catch (e: Exception) {
                Toast.makeText(this@ReportsActivity, e.friendlyMessage(), Toast.LENGTH_LONG).show()
            } finally {
                b.swipe.isRefreshing = false
            }
        }
    }

    // ---------- helpers that build the cards ----------

    private fun statRow(left: Triple<String, String, String>, right: Triple<String, String, String>) {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(10) }
        }
        listOf(left, right).forEachIndexed { i, (label, value, sub) ->
            val s = ItemStatBinding.inflate(layoutInflater, row, false)
            s.tvLabel.text = label
            s.tvValue.text = value
            s.tvSub.text = sub
            s.root.layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { if (i == 1) marginStart = dp(10) }
            row.addView(s.root)
        }
        b.content.addView(row)
    }

    private fun panel(title: String, sub: String): LinearLayout {
        val p = ItemPanelBinding.inflate(layoutInflater, b.content, false)
        p.tvTitle.text = title
        p.tvSub.text = sub
        b.content.addView(p.root)
        return p.body
    }

    private fun barRow(parent: LinearLayout, label: String, value: String, percent: Int) {
        val r = ItemBarBinding.inflate(layoutInflater, parent, false)
        r.tvLabel.text = label
        r.tvValue.text = value
        r.bar.progress = percent.coerceIn(0, 100)
        parent.addView(r.root)
    }

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    /** more than ~14 points get grouped so the bars stay readable */
    private fun chartPoints(byDay: List<SalesDay>): Pair<List<Float>, List<String>> {
        if (byDay.size <= 14) return byDay.map { it.revenue.toFloat() } to byDay.map { if (byDay.size <= 7) it.date.weekday() else it.date.dayMonth() }
        val group = Math.ceil(byDay.size / 12.0).toInt()
        val chunks = byDay.chunked(group)
        return chunks.map { c -> c.sumOf { it.revenue }.toFloat() } to chunks.map { it.first().date.dayMonth() }
    }

    // ---------- sales ----------

    private fun renderSales(r: SalesReport) {
        b.content.removeAllViews()
        val s = r.summary
        statRow(Triple("REVENUE", s.revenue.inrShort(), "from ${s.orders} orders"), Triple("ORDERS", s.orders.toString(), "non-cancelled"))
        statRow(Triple("UNITS SOLD", s.itemsSold.toString(), "across all products"), Triple("AVG ORDER", s.averageOrderValue.inrShort(), "${s.discount.inr()} discounts"))

        if (s.orders == 0) {
            panel("No sales in this period", "Try a longer range.")
            return
        }
        val chartBody = panel("Revenue over time", "Cancelled orders excluded")
        val (values, labels) = chartPoints(r.byDay)
        chartBody.addView(BarChartView(this).apply {
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
            setData(values, labels)
        })

        val topBody = panel("Top products", "By revenue")
        val maxRev = (r.topProducts.maxOfOrNull { it.revenue ?: 0.0 } ?: 1.0).coerceAtLeast(1.0)
        r.topProducts.forEachIndexed { i, p ->
            barRow(topBody, "${i + 1}.  ${p.name}", (p.revenue ?: 0.0).inrShort(), (((p.revenue ?: 0.0) / maxRev) * 100).toInt())
        }

        val catBody = panel("Revenue by category", "Share of sales")
        val total = r.byCategory.sumOf { it.revenue }.coerceAtLeast(1.0)
        r.byCategory.forEach { c ->
            val pct = (c.revenue / total * 100).toInt()
            barRow(catBody, c.category, "${c.revenue.inrShort()} · $pct%", pct)
        }
    }

    // ---------- inventory ----------

    private fun renderInventory(r: InventoryReport) {
        b.content.removeAllViews()
        val s = r.summary
        statRow(Triple("STOCK VALUE", s.value.inrShort(), "at selling price"), Triple("PRODUCTS", s.products.toString(), "${s.units} units"))
        statRow(Triple("LOW STOCK", s.lowStock.toString(), "at or below alert"), Triple("OUT OF STOCK", s.outOfStock.toString(), "needs restocking"))

        val catBody = panel("Stock value by category", "Where your money is sitting")
        val total = r.byCategory.sumOf { it.value }.coerceAtLeast(1.0)
        r.byCategory.forEach { c ->
            val pct = (c.value / total * 100).toInt()
            barRow(catBody, "${c.category} (${c.products})", "${c.value.inrShort()} · $pct%", pct)
        }

        val attBody = panel("Needs attention", if (r.attention.isEmpty()) "All stocked up." else "Low or out of stock")
        r.attention.forEach { p ->
            val row = ItemRowBinding.inflate(layoutInflater, attBody, false)
            row.render(
                Row(
                    title = p.name,
                    sub = "${p.sku} · ${p.category}",
                    end = "${p.stock} left",
                    chip = if (p.stock <= 0) "OUT" else "LOW",
                    chipColor = if (p.stock <= 0) R.color.red else R.color.amber,
                    badge = p.name.take(1).uppercase(),
                    stock = p.stock,
                    threshold = p.lowStockThreshold
                )
            )
            attBody.addView(row.root)
        }
    }
}
