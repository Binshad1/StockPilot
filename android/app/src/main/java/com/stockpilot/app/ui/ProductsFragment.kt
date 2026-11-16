package com.stockpilot.app.ui

import android.view.LayoutInflater
import android.widget.Toast
import androidx.core.content.ContextCompat
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.stockpilot.app.R
import com.stockpilot.app.data.Net
import com.stockpilot.app.data.NewProductRequest
import com.stockpilot.app.data.Product
import com.stockpilot.app.data.StockRequest
import com.stockpilot.app.data.UpdateProductRequest
import com.stockpilot.app.databinding.SheetProductBinding

class ProductsFragment : ListFragment() {
    override val searchHint = "Search name, SKU or category"
    override val emptyText = "No products found"
    override val fabLabel = "Add product"
    override val showFab get() = isAdmin() // only admins can create products
    override val filters = listOf("All" to "", "In stock" to "ok", "Low" to "low", "Out" to "out")

    override suspend fun loadRows(query: String, filter: String): List<Row> =
        Net.api(requireContext()).products(query.ifEmpty { null }, status = filter.ifEmpty { null }).data.map { p ->
            val (label, tone) = when {
                p.stock <= 0 -> "OUT" to "bad"
                p.stock <= p.lowStockThreshold -> "LOW" to "warn"
                else -> "IN STOCK" to "good"
            }
            Row(
                title = p.name,
                sub = "${p.sku} · ${p.category}",
                end = p.price.inr(),
                chip = label,
                chipColor = color(tone),
                badge = p.name.take(1).uppercase(),
                stock = p.stock,
                threshold = p.lowStockThreshold
            ) { showProductSheet(p) }
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

    /** Stock in / out for one product. Admins also get Edit and Delete. */
    private fun showProductSheet(p: Product) {
        val ctx = requireContext()
        val d = SheetProductBinding.inflate(LayoutInflater.from(ctx))
        val dialog = BottomSheetDialog(ctx)
        dialog.setContentView(d.root)
        dialog.setOnShowListener {
            dialog.behavior.state = BottomSheetBehavior.STATE_EXPANDED
            dialog.behavior.skipCollapsed = true
        }

        d.tvName.text = p.name
        d.tvMeta.text = "${p.sku} · ${p.category} · ${p.price.inr()}"
        d.tvStock.text = p.stock.toString()
        d.meter.set(p.stock, p.lowStockThreshold)
        d.tvAlert.text = "alert at ${p.lowStockThreshold}"
        d.tvStock.setTextColor(
            ContextCompat.getColor(ctx, if (p.stock <= 0) R.color.red else if (p.stock <= p.lowStockThreshold) R.color.amber else R.color.text)
        )

        var stockIn = true
        d.toggle.check(d.btnIn.id)
        d.toggle.addOnButtonCheckedListener { _, id, isChecked ->
            if (isChecked) {
                stockIn = id == d.btnIn.id
                d.btnSave.text = if (stockIn) "Add stock" else "Remove stock"
            }
        }

        d.btnSave.setOnClickListener {
            val qty = d.etQty.text.toString().toIntOrNull()
            if (qty == null || qty < 1) {
                Toast.makeText(ctx, "Enter a quantity of 1 or more", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (!stockIn && qty > p.stock) {
                Toast.makeText(ctx, "Only ${p.stock} in stock", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val note = d.etNote.text.toString().trim()
            dialog.dismiss()
            launchApi {
                val api = Net.api(ctx)
                if (stockIn) api.stockIn(StockRequest(p.id, qty, "purchase", note))
                else api.stockOut(StockRequest(p.id, qty, "adjustment", note))
                toast(if (stockIn) "Added $qty units to ${p.name}" else "Removed $qty units from ${p.name}")
                refresh()
            }
        }

        if (isAdmin()) {
            d.adminRow.visibility = android.view.View.VISIBLE
            d.btnEdit.setOnClickListener {
                dialog.dismiss()
                editProduct(p)
            }
            d.btnDelete.setOnClickListener {
                dialog.dismiss()
                MaterialAlertDialogBuilder(ctx)
                    .setTitle("Delete ${p.name}?")
                    .setMessage("It will be removed from your catalogue. Past orders keep their own copy of the product details.")
                    .setNegativeButton("Cancel", null)
                    .setPositiveButton("Delete") { _, _ ->
                        launchApi {
                            Net.api(ctx).deleteProduct(p.id)
                            toast("Product deleted")
                            refresh()
                        }
                    }
                    .show()
            }
        }
        dialog.show()
    }

    private fun editProduct(p: Product) {
        FormDialog.show(
            requireContext(), "Edit product", "Save",
            listOf(
                Field("name", "Name", required = true, default = p.name),
                Field("sku", "SKU", required = true, default = p.sku),
                Field("category", "Category", required = true, default = p.category),
                Field("price", "Price (₹)", number = true, required = true, default = p.price.toString().removeSuffix(".0")),
                Field("threshold", "Low-stock alert at", number = true, default = p.lowStockThreshold.toString())
            )
        ) { v ->
            launchApi {
                Net.api(requireContext()).updateProduct(
                    p.id,
                    UpdateProductRequest(
                        v.getValue("name"), v.getValue("sku"), v.getValue("category"),
                        v.getValue("price").toDoubleOrNull() ?: p.price,
                        v.getValue("threshold").toIntOrNull() ?: p.lowStockThreshold
                    )
                )
                toast("Product updated")
                refresh()
            }
        }
    }
}
