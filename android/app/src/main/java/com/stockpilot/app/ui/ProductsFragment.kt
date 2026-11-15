package com.stockpilot.app.ui

import android.view.LayoutInflater
import android.widget.Toast
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.stockpilot.app.data.NewProductRequest
import com.stockpilot.app.data.Net
import com.stockpilot.app.data.Product
import com.stockpilot.app.data.StockRequest
import com.stockpilot.app.databinding.DialogStockBinding

class ProductsFragment : ListFragment() {
    override val searchHint = "Search name, SKU or category"
    override val emptyText = "No products found"
    override val fabLabel = "Add product"
    override val showFab get() = isAdmin() // only admins can create products

    override suspend fun loadRows(query: String): List<Row> =
        Net.api(requireContext()).products(query.ifEmpty { null }).data.map { p ->
            val (label, tone) = when {
                p.stock <= 0 -> "OUT OF STOCK" to "bad"
                p.stock <= p.lowStockThreshold -> "LOW STOCK" to "warn"
                else -> "IN STOCK" to "good"
            }
            Row(p.name, "${p.sku} · ${p.category}", "${p.price.inr()}  ·  ${p.stock}", label, color(tone)) { showStockDialog(p) }
        }

    override fun onFabClick() {
        FormDialog.show(
            requireContext(), "Add product", "Create",
            listOf(
                Field("name", "Name", required = true),
                Field("sku", "SKU", required = true),
                Field("category", "Category", required = true),
                Field("price", "Price (₹)", number = true, required = true),
                Field("stock", "Opening stock", number = true, default = "0"),
                Field("threshold", "Low-stock alert at", number = true, default = "10")
            )
        ) { v ->
            launchApi {
                Net.api(requireContext()).addProduct(
                    NewProductRequest(
                        v.getValue("name"), v.getValue("sku"), v.getValue("category"),
                        v.getValue("price").toDoubleOrNull() ?: 0.0,
                        v.getValue("stock").toIntOrNull() ?: 0,
                        v.getValue("threshold").toIntOrNull() ?: 10
                    )
                )
                toast("Product created")
                refresh()
            }
        }
    }

    /** Stock in / stock out for one product. */
    private fun showStockDialog(p: Product) {
        val d = DialogStockBinding.inflate(LayoutInflater.from(requireContext()))
        d.tvCurrent.text = "Current stock: ${p.stock}  ·  alert at ${p.lowStockThreshold}"

        MaterialAlertDialogBuilder(requireContext())
            .setTitle(p.name)
            .setView(d.root)
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Save") { _, _ ->
                val qty = d.etQty.text.toString().toIntOrNull()
                if (qty == null || qty < 1) {
                    Toast.makeText(requireContext(), "Enter a quantity of 1 or more", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                val stockIn = d.toggle.checkedButtonId == d.btnIn.id
                val note = d.etNote.text.toString().trim()
                launchApi {
                    val api = Net.api(requireContext())
                    if (stockIn) api.stockIn(StockRequest(p.id, qty, "purchase", note))
                    else api.stockOut(StockRequest(p.id, qty, "adjustment", note))
                    toast(if (stockIn) "Added $qty units" else "Removed $qty units")
                    refresh()
                }
            }
            .show()
    }
}
