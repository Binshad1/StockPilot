package com.stockpilot.app.ui

import android.content.res.ColorStateList
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.core.widget.doAfterTextChanged
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.chip.Chip
import com.stockpilot.app.R
import com.stockpilot.app.databinding.FragmentListBinding
import com.stockpilot.app.databinding.ItemRowBinding
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** What one card in a list shows. [chipColor] is a colour resource id. */
data class Row(
    val title: String,
    val sub: String,
    val end: String,
    val chip: String,
    val chipColor: Int,
    val badge: String = "",
    val stock: Int = -1,
    val threshold: Int = 0,
    val onClick: (() -> Unit)? = null
)

/** Fills one item_row card from a [Row]. Also used by the dashboard and the reports. */
fun ItemRowBinding.render(r: Row) {
    val ctx = root.context
    tvInitial.text = r.badge.ifEmpty { r.title.take(1).uppercase() }
    tvTitle.text = r.title
    tvSub.text = r.sub
    tvEnd.text = r.end
    if (r.chip.isEmpty()) {
        tvChip.visibility = View.GONE
    } else {
        tvChip.visibility = View.VISIBLE
        tvChip.applyChip(r.chip, ContextCompat.getColor(ctx, r.chipColor))
    }
    if (r.stock >= 0) {
        meter.visibility = View.VISIBLE
        meter.set(r.stock, r.threshold)
    } else {
        meter.visibility = View.GONE
    }
    root.isClickable = r.onClick != null
    root.setOnClickListener { r.onClick?.invoke() }
}

class RowAdapter : RecyclerView.Adapter<RowAdapter.VH>() {
    private var rows: List<Row> = emptyList()

    fun submit(list: List<Row>) {
        rows = list
        notifyDataSetChanged()
    }

    class VH(val b: ItemRowBinding) : RecyclerView.ViewHolder(b.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        VH(ItemRowBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun onBindViewHolder(h: VH, position: Int) = h.b.render(rows[position])

    override fun getItemCount() = rows.size
}

/**
 * Shared screen for Products / Orders / Customers / Team: search box, optional filter chips,
 * pull-to-refresh, list and a floating button. A subclass only says how to load its rows.
 */
abstract class ListFragment : Fragment() {

    private var _b: FragmentListBinding? = null
    protected val b get() = _b!!
    private val adapter = RowAdapter()
    private var searchJob: Job? = null
    private var filterKey = ""

    abstract val searchHint: String
    abstract val emptyText: String
    abstract val fabLabel: String
    protected open val showFab: Boolean get() = true
    /** label to key pairs; leave empty for no filter chips */
    protected open val filters: List<Pair<String, String>> get() = emptyList()

    abstract suspend fun loadRows(query: String, filter: String): List<Row>
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
        buildFilterChips()

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

    private fun buildFilterChips() {
        if (filters.isEmpty()) return
        val ctx = requireContext()
        val checked = intArrayOf(android.R.attr.state_checked)
        val none = intArrayOf()
        val bg = ColorStateList(arrayOf(checked, none), intArrayOf(ContextCompat.getColor(ctx, R.color.amber), ContextCompat.getColor(ctx, R.color.surface2)))
        val fg = ColorStateList(arrayOf(checked, none), intArrayOf(ContextCompat.getColor(ctx, R.color.amber_ink), ContextCompat.getColor(ctx, R.color.muted)))
        b.filterScroll.visibility = View.VISIBLE
        filters.forEachIndexed { i, (label, key) ->
            val chip = Chip(ctx).apply {
                text = label
                id = View.generateViewId()
                isCheckable = true
                isCheckedIconVisible = false
                chipBackgroundColor = bg
                setTextColor(fg)
                chipStrokeColor = ColorStateList.valueOf(ContextCompat.getColor(ctx, R.color.line2))
                chipStrokeWidth = ctx.dp(1).toFloat()
            }
            chip.setOnClickListener {
                filterKey = key
                refresh()
            }
            b.filters.addView(chip)
            if (i == 0) chip.isChecked = true
        }
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
                val rows = loadRows(binding.etSearch.text.toString().trim(), filterKey)
                adapter.submit(rows)
                _b?.emptyBox?.visibility = if (rows.isEmpty()) View.VISIBLE else View.GONE
            } finally {
                _b?.swipe?.isRefreshing = false
            }
        }
    }

    /** colour resource id for "good" / "warn" / "bad" / anything else */
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
