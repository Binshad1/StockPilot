package com.stockpilot.app.ui

import com.stockpilot.app.data.Net
import com.stockpilot.app.data.NewCustomerRequest

class CustomersFragment : ListFragment() {
    override val searchHint = "Search name, email or phone"
    override val emptyText = "No customers yet"
    override val fabLabel = "Add customer"

    override suspend fun loadRows(query: String): List<Row> =
        Net.api(requireContext()).customers(query.ifEmpty { null }).data.map { c ->
            val contact = listOfNotNull(c.phone?.takeIf { it.isNotBlank() }, c.email?.takeIf { it.isNotBlank() }).joinToString(" · ")
            Row(c.name, contact.ifEmpty { c.address ?: "" }, (c.totalSpent ?: 0.0).inr(), "${c.orders ?: 0} ORDERS", color("neutral"))
        }

    override fun onFabClick() {
        FormDialog.show(
            requireContext(), "Add customer", "Add",
            listOf(
                Field("name", "Name", required = true),
                Field("phone", "Phone"),
                Field("email", "Email"),
                Field("address", "Address")
            )
        ) { v ->
            launchApi {
                Net.api(requireContext()).addCustomer(NewCustomerRequest(v.getValue("name"), v.getValue("phone"), v.getValue("email"), v.getValue("address")))
                toast("Customer added")
                refresh()
            }
        }
    }
}
