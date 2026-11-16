package com.stockpilot.app.ui

import android.content.Intent
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.stockpilot.app.R
import com.stockpilot.app.data.Net
import com.stockpilot.app.data.Order
import com.stockpilot.app.data.StatusRequest

class OrdersFragment : ListFragment() {
    override val searchHint = "Search order no. or customer"
    override val emptyText = "No orders found"
    override val fabLabel = "New order"
    override val filters = listOf("All" to "", "Pending" to "pending", "Completed" to "completed", "Cancelled" to "cancelled")

    private fun tone(status: String) = when (status) {
        "completed" -> "good"
        "cancelled" -> "bad"
        else -> "warn"
    }

    override suspend fun loadRows(query: String, filter: String): List<Row> =
        Net.api(requireContext()).orders(query.ifEmpty { null }, status = filter.ifEmpty { null }).data.map { o ->
            Row(
                title = o.orderNumber,
                sub = "${o.customerName} · ${o.items.sumOf { it.quantity }} items · ${o.createdAt.shortDate()}",
                end = o.total.inr(),
                chip = o.status.uppercase(),
                chipColor = color(tone(o.status)),
                badge = o.customerName.take(1).uppercase()
            ) { showOrder(o) }
        }

    override fun onFabClick() {
        startActivity(Intent(requireContext(), NewOrderActivity::class.java))
    }

    private fun showOrder(o: Order) {
        val ctx = requireContext()
        val sheet = DetailSheet(ctx)
            .title(o.orderNumber, "${o.customerName} · ${o.createdAt.shortDate()}")
            .chip(o.status.uppercase(), color(tone(o.status)))

        o.items.forEach { sheet.line("${it.name} × ${it.quantity}", (it.price * it.quantity).inr()) }
        if (o.discount > 0) sheet.line("Discount", "− ${o.discount.inr()}")
        sheet.line("Total", o.total.inr())

        if (o.status == "pending") {
            sheet.action("Mark completed", ActionStyle.PRIMARY) { changeStatus(o, "completed") }
        }
        // Only admins may cancel (the API enforces this too). Cancelling puts the stock back.
        if (o.status != "cancelled" && isAdmin()) {
            sheet.action("Cancel order", ActionStyle.DANGER, R.drawable.ic_delete) {
                MaterialAlertDialogBuilder(ctx)
                    .setTitle("Cancel ${o.orderNumber}?")
                    .setMessage("The items will be returned to stock. This can't be undone.")
                    .setNegativeButton("Keep order", null)
                    .setPositiveButton("Cancel order") { _, _ -> changeStatus(o, "cancelled") }
                    .show()
            }
        }
        sheet.show()
    }

    private fun changeStatus(o: Order, status: String) {
        launchApi {
            Net.api(requireContext()).setOrderStatus(o.id, StatusRequest(status))
            toast(if (status == "cancelled") "Order cancelled, stock returned" else "Order completed")
            refresh()
        }
    }
}
