package com.stockpilot.app.ui

import android.content.Intent
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.stockpilot.app.R
import com.stockpilot.app.data.Customer
import com.stockpilot.app.data.Net
import com.stockpilot.app.data.NewCustomerRequest

class CustomersFragment : ListFragment() {
    override val searchHint = "Search name, email or phone"
    override val emptyText = "No customers yet"
    override val fabLabel = "Add customer"

    override suspend fun loadRows(query: String, filter: String): List<Row> =
        Net.api(requireContext()).customers(query.ifEmpty { null }).data.map { c ->
            val contact = listOfNotNull(c.phone?.takeIf { it.isNotBlank() }, c.email?.takeIf { it.isNotBlank() }).joinToString(" · ")
            Row(
                title = c.name,
                sub = contact.ifEmpty { c.address ?: "No contact details" },
                end = (c.totalSpent ?: 0.0).inr(),
                chip = "${c.orders ?: 0} ORDERS",
                chipColor = color("neutral"),
                badge = c.name.take(1).uppercase()
            ) { showCustomer(c) }
        }

    override fun onFabClick() = form(null)

    private fun showCustomer(c: Customer) {
        val ctx = requireContext()
        val sheet = DetailSheet(ctx).title(c.name, c.address?.takeIf { it.isNotBlank() })
        c.phone?.takeIf { it.isNotBlank() }?.let { sheet.line("Phone", it) }
        c.email?.takeIf { it.isNotBlank() }?.let { sheet.line("Email", it) }
        sheet.line("Orders", (c.orders ?: 0).toString())
        sheet.line("Total spent", (c.totalSpent ?: 0.0).inr())

        sheet.action("New order for ${c.name.substringBefore(" ")}", ActionStyle.PRIMARY, R.drawable.ic_cart) {
            startActivity(Intent(ctx, NewOrderActivity::class.java).putExtra(NewOrderActivity.EXTRA_CUSTOMER_ID, c.id))
        }
        sheet.action("Edit customer", ActionStyle.OUTLINE, R.drawable.ic_edit) { form(c) }
        if (isAdmin()) {
            sheet.action("Delete customer", ActionStyle.DANGER, R.drawable.ic_delete) {
                MaterialAlertDialogBuilder(ctx)
                    .setTitle("Delete ${c.name}?")
                    .setMessage("Customers who already have orders can't be deleted.")
                    .setNegativeButton("Cancel", null)
                    .setPositiveButton("Delete") { _, _ ->
                        launchApi {
                            Net.api(ctx).deleteCustomer(c.id)
                            toast("Customer deleted")
                            refresh()
                        }
                    }
                    .show()
            }
        }
        sheet.show()
    }

    /** Add (c == null) or edit a customer. */
    private fun form(c: Customer?) {
        FormDialog.show(
            requireContext(), if (c == null) "Add customer" else "Edit customer", if (c == null) "Add" else "Save",
            listOf(
                Field("name", "Name", required = true, default = c?.name ?: ""),
                Field("phone", "Phone", default = c?.phone ?: ""),
                Field("email", "Email", default = c?.email ?: ""),
                Field("address", "Address", default = c?.address ?: "")
            )
        ) { v ->
            launchApi {
                val body = NewCustomerRequest(v.getValue("name"), v.getValue("phone"), v.getValue("email"), v.getValue("address"))
                if (c == null) Net.api(requireContext()).addCustomer(body) else Net.api(requireContext()).updateCustomer(c.id, body)
                toast(if (c == null) "Customer added" else "Customer updated")
                refresh()
            }
        }
    }
}
