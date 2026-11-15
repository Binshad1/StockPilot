package com.stockpilot.app.ui

import android.content.Intent
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.stockpilot.app.data.Net
import com.stockpilot.app.data.Order
import com.stockpilot.app.data.StatusRequest

class OrdersFragment : ListFragment() {
    override val searchHint = "Search order no. or customer"
    override val emptyText = "No orders yet"
    override val fabLabel = "New order"

    override suspend fun loadRows(query: String): List<Row> =
        Net.api(requireContext()).orders(query.ifEmpty { null }).data.map { o ->
            val tone = when (o.status) { "completed" -> "good"; "cancelled" -> "bad"; else -> "warn" }
            Row(
                "${o.orderNumber} · ${o.customerName}",
                "${o.items.sumOf { it.quantity }} items · ${o.createdAt.shortDate()}",
                o.total.inr(), o.status.uppercase(), color(tone)
            ) { showOrder(o) }
        }

    override fun onFabClick() {
        startActivity(Intent(requireContext(), NewOrderActivity::class.java))
    }

    private fun showOrder(o: Order) {
        val lines = o.items.joinToString("\n") { "• ${it.name} × ${it.quantity}   ${(it.price * it.quantity).inr()}" }
        val discount = if (o.discount > 0) "\nDiscount: −${o.discount.inr()}" else ""
        val builder = MaterialAlertDialogBuilder(requireContext())
            .setTitle(o.orderNumber)
            .setMessage("${o.customerName}\n${o.createdAt.shortDate()} · ${o.status.uppercase()}\n\n$lines$discount\n\nTotal: ${o.total.inr()}")
            .setNegativeButton("Close", null)

        if (o.status == "pending") {
            builder.setPositiveButton("Mark completed") { _, _ -> changeStatus(o, "completed") }
        }
        // Only admins may cancel (the API enforces this too). Cancelling puts the stock back.
        if (o.status != "cancelled" && isAdmin()) {
            builder.setNeutralButton("Cancel order") { _, _ ->
                MaterialAlertDialogBuilder(requireContext())
                    .setTitle("Cancel ${o.orderNumber}?")
                    .setMessage("The items will be returned to stock.")
                    .setNegativeButton("Keep order", null)
                    .setPositiveButton("Cancel order") { _, _ -> changeStatus(o, "cancelled") }
                    .show()
            }
        }
        builder.show()
    }

    private fun changeStatus(o: Order, status: String) {
        launchApi {
            Net.api(requireContext()).setOrderStatus(o.id, StatusRequest(status))
            toast(if (status == "cancelled") "Order cancelled, stock returned" else "Order completed")
            refresh()
        }
    }
}
