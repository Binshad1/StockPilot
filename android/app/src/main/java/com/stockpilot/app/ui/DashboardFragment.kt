package com.stockpilot.app.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.stockpilot.app.R
import com.stockpilot.app.data.Net
import com.stockpilot.app.data.Session
import com.stockpilot.app.databinding.FragmentDashboardBinding
import com.stockpilot.app.databinding.ItemBarBinding
import com.stockpilot.app.databinding.ItemRowBinding
import java.util.Calendar
import java.util.Locale

class DashboardFragment : Fragment() {

    private var _b: FragmentDashboardBinding? = null
    private val b get() = _b!!

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, state: Bundle?): View {
        _b = FragmentDashboardBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val first = Session.user(requireContext())?.name?.substringBefore(" ") ?: ""
        val cal = Calendar.getInstance()
        val hour = cal.get(Calendar.HOUR_OF_DAY)
        val greeting = if (hour < 12) "Good morning" else if (hour < 17) "Good afternoon" else "Good evening"
        val day = cal.getDisplayName(Calendar.DAY_OF_WEEK, Calendar.LONG, Locale.ENGLISH)?.uppercase() ?: ""
        b.tvDay.text = "◆ $day · OPERATIONS OVERVIEW"
        b.tvHello.text = "$greeting, $first."
        b.banner.setOnClickListener { (activity as? MainActivity)?.selectTab(R.id.nav_products) }
        b.swipe.setOnRefreshListener { load() }
        load()
    }

    override fun onResume() {
        super.onResume()
        if (_b != null) load()
    }

    private fun load() {
        _b?.swipe?.isRefreshing = true
        launchApi {
            try {
                val d = Net.api(requireContext()).dashboard()
                val t = d.totals
                val binding = _b ?: return@launchApi

                binding.tvValue.text = t.inventoryValue.inrShort()
                binding.tvUnits.text = "${t.stockUnits} units across ${t.products} products"
                binding.tvToday.text = t.revenueToday.inrShort()
                binding.tvMonth.text = "${t.revenueMonth.inrShort()} this month"
                binding.tvOrders.text = t.orders.toString()
                binding.tvPending.text = "${t.pendingOrders} pending · ${t.completedOrders ?: 0} done"
                binding.tvProducts.text = t.products.toString()
                binding.tvCustomers.text = "${t.customers} customers"
                binding.tvLow.text = t.lowStock.toString().padStart(2, '0')
                binding.tvOut.text = if (t.lowStock > 0) "needs attention" else "all healthy"

                (activity as? MainActivity)?.setLowStockBadge(t.lowStock)
                binding.banner.visibility = if (t.lowStock > 0) View.VISIBLE else View.GONE
                binding.tvBanner.text = "${t.lowStock} product${if (t.lowStock > 1) "s" else ""} running low" +
                    if (t.outOfStock > 0) " · ${t.outOfStock} out" else ""

                // sales chart
                val sales = d.sales ?: emptyList()
                binding.chart.setData(sales.map { it.revenue.toFloat() }, sales.map { it.date.weekday() })
                binding.tvSalesSub.text = "${sales.sumOf { it.revenue }.inr()} from non-cancelled orders"

                // top sellers
                binding.topList.removeAllViews()
                val top = d.topProducts ?: emptyList()
                val maxQty = (top.maxOfOrNull { it.quantity } ?: 1).coerceAtLeast(1)
                binding.tvTopSub.text = "Units sold · last 30 days"
                if (top.isEmpty()) binding.tvTopSub.text = "No sales yet. Create an order to see your best sellers."
                top.forEachIndexed { i, p ->
                    val row = ItemBarBinding.inflate(layoutInflater, binding.topList, false)
                    row.tvLabel.text = "${i + 1}.  ${p.name}"
                    row.tvValue.text = "${p.quantity} units"
                    row.bar.progress = p.quantity * 100 / maxQty
                    binding.topList.addView(row.root)
                }

                // low-stock watchlist
                binding.lowList.removeAllViews()
                binding.tvLowSub.text = if (d.lowStockItems.isEmpty()) "Nothing is running low right now." else "At or below alert level"
                d.lowStockItems.forEach { p ->
                    val row = ItemRowBinding.inflate(layoutInflater, binding.lowList, false)
                    row.render(
                        Row(
                            title = p.name,
                            sub = "${p.sku} · alert at ${p.lowStockThreshold}",
                            end = "${p.stock} left",
                            chip = if (p.stock <= 0) "OUT" else "LOW",
                            chipColor = if (p.stock <= 0) R.color.red else R.color.amber,
                            badge = p.name.take(1).uppercase(),
                            stock = p.stock,
                            threshold = p.lowStockThreshold
                        )
                    )
                    binding.lowList.addView(row.root)
                }
            } finally {
                _b?.swipe?.isRefreshing = false
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _b = null
    }
}
