package com.stockpilot.app.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.stockpilot.app.data.Net
import com.stockpilot.app.data.Session
import com.stockpilot.app.databinding.FragmentDashboardBinding
import com.stockpilot.app.databinding.ItemRowBinding

class DashboardFragment : Fragment() {

    private var _b: FragmentDashboardBinding? = null
    private val b get() = _b!!

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, state: Bundle?): View {
        _b = FragmentDashboardBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val name = Session.user(requireContext())?.name?.substringBefore(" ") ?: ""
        b.tvHello.text = "Hello, $name"
        b.swipe.setOnRefreshListener { load() }
        load()
    }

    private fun load() {
        b.swipe.isRefreshing = true
        launchApi {
            try {
                val d = Net.api(requireContext()).dashboard()
                val t = d.totals
                b.tvValue.text = t.inventoryValue.inr()
                b.tvUnits.text = "${t.stockUnits} units in stock"
                b.tvToday.text = t.revenueToday.inr()
                b.tvMonth.text = "${t.revenueMonth.inr()} this month"
                b.tvOrders.text = t.orders.toString()
                b.tvPending.text = "${t.pendingOrders} pending"
                b.tvProducts.text = t.products.toString()
                b.tvCustomers.text = "${t.customers} customers"
                b.tvLow.text = t.lowStock.toString()
                b.tvOut.text = "${t.outOfStock} out of stock"

                b.lowList.removeAllViews()
                d.lowStockItems.forEach { p ->
                    val row = ItemRowBinding.inflate(layoutInflater, b.lowList, false)
                    row.tvTitle.text = p.name
                    row.tvSub.text = "${p.sku} · alert at ${p.lowStockThreshold}"
                    row.tvEnd.text = "${p.stock} left"
                    row.tvChip.text = if (p.stock <= 0) "OUT" else "LOW"
                    row.tvChip.setTextColor(resources.getColor(if (p.stock <= 0) com.stockpilot.app.R.color.red else com.stockpilot.app.R.color.amber, null))
                    b.lowList.addView(row.root)
                }
                b.tvAllGood.visibility = if (d.lowStockItems.isEmpty()) View.VISIBLE else View.GONE
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
