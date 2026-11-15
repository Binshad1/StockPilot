package com.stockpilot.app.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.widget.doAfterTextChanged
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.stockpilot.app.data.Customer
import com.stockpilot.app.data.Net
import com.stockpilot.app.data.NewOrderRequest
import com.stockpilot.app.data.OrderLine
import com.stockpilot.app.data.Product
import com.stockpilot.app.databinding.ActivityNewOrderBinding
import com.stockpilot.app.databinding.ItemPickBinding
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import retrofit2.HttpException

/** Create an order: pick a customer, set quantities with +/- and place it. The server deducts stock. */
class NewOrderActivity : AppCompatActivity() {

    private lateinit var b: ActivityNewOrderBinding
    private var products: List<Product> = emptyList()
    private var customers: List<Customer> = emptyList()
    private val cart = linkedMapOf<String, Product>()      // productId -> product
    private val qty = mutableMapOf<String, Int>()          // productId -> quantity
    private var searchJob: Job? = null
    private lateinit var adapter: PickAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityNewOrderBinding.inflate(layoutInflater)
        setContentView(b.root)
        b.toolbar.setNavigationOnClickListener { finish() }

        adapter = PickAdapter()
        b.recycler.layoutManager = LinearLayoutManager(this)
        b.recycler.adapter = adapter
        b.btnPlace.setOnClickListener { place() }
        b.etSearch.doAfterTextChanged {
            searchJob?.cancel()
            searchJob = lifecycleScope.launch { delay(350); loadProducts() }
        }
        loadCustomers()
        loadProducts()
        updateTotal()
    }

    private var selectedCustomerId: String? = null

    private fun loadCustomers() = lifecycleScope.launch {
        try {
            customers = Net.api(this@NewOrderActivity).customers(null, 1, 100).data
            val names = listOf("Walk-in customer") + customers.map { it.name }
            b.spCustomer.adapter = ArrayAdapter(this@NewOrderActivity, android.R.layout.simple_spinner_dropdown_item, names)
            b.spCustomer.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                override fun onItemSelected(p: AdapterView<*>?, v: View?, pos: Int, id: Long) {
                    selectedCustomerId = if (pos == 0) null else customers[pos - 1].id
                }
                override fun onNothingSelected(p: AdapterView<*>?) {}
            }
        } catch (e: Exception) {
            Toast.makeText(this@NewOrderActivity, e.friendlyMessage(), Toast.LENGTH_LONG).show()
        }
    }

    private fun loadProducts() = lifecycleScope.launch {
        try {
            val q = b.etSearch.text.toString().trim().ifEmpty { null }
            products = Net.api(this@NewOrderActivity).products(q, 1, 100).data
            adapter.notifyDataSetChanged()
        } catch (e: Exception) {
            Toast.makeText(this@NewOrderActivity, e.friendlyMessage(), Toast.LENGTH_LONG).show()
        }
    }

    private fun change(p: Product, delta: Int) {
        val next = ((qty[p.id] ?: 0) + delta).coerceIn(0, p.stock)
        if (next == 0) { qty.remove(p.id); cart.remove(p.id) } else { qty[p.id] = next; cart[p.id] = p }
        adapter.notifyDataSetChanged()
        updateTotal()
    }

    private fun updateTotal() {
        val total = cart.values.sumOf { it.price * (qty[it.id] ?: 0) }
        val units = qty.values.sum()
        b.tvTotal.text = total.inr()
        b.tvCount.text = "$units unit${if (units == 1) "" else "s"} · ${cart.size} product${if (cart.size == 1) "" else "s"}"
        b.btnPlace.isEnabled = cart.isNotEmpty()
    }

    private fun place() {
        b.btnPlace.isEnabled = false
        b.btnPlace.text = "Placing…"
        lifecycleScope.launch {
            try {
                val order = Net.api(this@NewOrderActivity).createOrder(
                    NewOrderRequest(selectedCustomerId, cart.keys.map { OrderLine(it, qty.getValue(it)) }, 0.0)
                )
                Toast.makeText(this@NewOrderActivity, "${order.orderNumber} created", Toast.LENGTH_LONG).show()
                finish()
            } catch (e: HttpException) {
                // e.g. 409 "Insufficient stock" - show the server's message and reload fresh stock numbers
                Toast.makeText(this@NewOrderActivity, e.friendlyMessage(), Toast.LENGTH_LONG).show()
                b.btnPlace.text = "Place order"
                b.btnPlace.isEnabled = cart.isNotEmpty()
                loadProducts()
            } catch (e: Exception) {
                Toast.makeText(this@NewOrderActivity, e.friendlyMessage(), Toast.LENGTH_LONG).show()
                b.btnPlace.text = "Place order"
                b.btnPlace.isEnabled = cart.isNotEmpty()
            }
        }
    }

    private inner class PickAdapter : RecyclerView.Adapter<PickAdapter.VH>() {
        inner class VH(val v: ItemPickBinding) : RecyclerView.ViewHolder(v.root)

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
            VH(ItemPickBinding.inflate(LayoutInflater.from(parent.context), parent, false))

        override fun getItemCount() = products.size

        override fun onBindViewHolder(h: VH, position: Int) {
            val p = products[position]
            h.v.tvTitle.text = p.name
            h.v.tvSub.text = "${p.price.inr()} · ${p.stock} in stock"
            h.v.tvQty.text = (qty[p.id] ?: 0).toString()
            h.v.btnMinus.setOnClickListener { change(p, -1) }
            h.v.btnPlus.setOnClickListener { change(p, +1) }
            h.v.btnPlus.isEnabled = p.stock > 0 && (qty[p.id] ?: 0) < p.stock
            h.v.btnPlus.alpha = if (h.v.btnPlus.isEnabled) 1f else 0.3f
        }
    }
}
