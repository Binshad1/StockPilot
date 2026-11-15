package com.stockpilot.app.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.widget.doAfterTextChanged
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.stockpilot.app.R
import com.stockpilot.app.databinding.FragmentListBinding
import com.stockpilot.app.databinding.ItemRowBinding
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** What one card in a list shows. */
data class Row(
    val title: String,
    val sub: String,
    val end: String,
    val chip: String,
    val chipColor: Int,
    val onClick: (() -> Unit)? = null
)

class RowAdapter : RecyclerView.Adapter<RowAdapter.VH>() {
    private var rows: List<Row> = emptyList()

    fun submit(list: List<Row>) {
        rows = list
        notifyDataSetChanged()
    }

    class VH(val b: ItemRowBinding) : RecyclerView.ViewHolder(b.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        VH(ItemRowBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun onBindViewHolder(h: VH, position: Int) {
        val r = rows[position]
        h.b.tvTitle.text = r.title
        h.b.tvSub.text = r.sub
        h.b.tvEnd.text = r.end
        h.b.tvChip.text = r.chip
        h.b.tvChip.visibility = if (r.chip.isEmpty()) View.GONE else View.VISIBLE
        h.b.tvChip.setTextColor(h.itemView.context.getColor(r.chipColor))
        h.b.root.setOnClickListener { r.onClick?.invoke() }
    }

    override fun getItemCount() = rows.size
}

/**
 * Shared screen for Products / Orders / Customers: search box + pull-to-refresh + list + floating button.
 * A subclass only says how to load its rows and what the "+" button does.
 */
abstract class ListFragment : Fragment() {

    private var _b: FragmentListBinding? = null
    protected val b get() = _b!!
    private val adapter = RowAdapter()
    private var searchJob: Job? = null

    abstract val searchHint: String
    abstract val emptyText: String
    abstract val fabLabel: String
    protected open val showFab: Boolean get() = true
    abstract suspend fun loadRows(query: String): List<Row>
    abstract fun onFabClick()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, state: Bundle?): View {
        _b = FragmentListBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        b.searchLayout.hint = searchHint
        b.tvEmpty.text = emptyText
        b.recycler.layoutManager = LinearLayoutManager(requireContext())
        b.recycler.adapter = adapter
        b.fab.text = fabLabel
        b.fab.visibility = if (showFab) View.VISIBLE else View.GONE
        b.fab.setOnClickListener { onFabClick() }
        b.swipe.setOnRefreshListener { refresh() }

        // search as you type (waits 350 ms after the last key press)
        b.etSearch.doAfterTextChanged {
            searchJob?.cancel()
            searchJob = viewLifecycleOwner.lifecycleScope.launch {
                delay(350)
                refresh()
            }
        }
        refresh()
    }

    override fun onResume() {
        super.onResume()
        if (_b != null) refresh() // e.g. after coming back from "New order"
    }

    protected fun refresh() {
        val binding = _b ?: return
        binding.swipe.isRefreshing = true
        launchApi {
            try {
                val rows = loadRows(binding.etSearch.text.toString().trim())
                adapter.submit(rows)
                _b?.tvEmpty?.visibility = if (rows.isEmpty()) View.VISIBLE else View.GONE
            } finally {
                _b?.swipe?.isRefreshing = false
            }
        }
    }

    protected fun color(name: String) = when (name) {
        "good" -> R.color.green
        "warn" -> R.color.amber
        "bad" -> R.color.red
        else -> R.color.muted
    }

    override fun onDestroyView() {
        super.onDestroyView()
        searchJob?.cancel()
        _b = null
    }
}
