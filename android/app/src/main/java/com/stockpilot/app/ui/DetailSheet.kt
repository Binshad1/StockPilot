package com.stockpilot.app.ui

import android.content.Context
import android.content.res.ColorStateList
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import androidx.core.content.ContextCompat
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.button.MaterialButton
import com.stockpilot.app.R
import com.stockpilot.app.databinding.ItemLineBinding
import com.stockpilot.app.databinding.SheetDetailBinding

enum class ActionStyle { PRIMARY, OUTLINE, DANGER }

/** A reusable bottom sheet: title, optional chip, label/value lines and action buttons. */
class DetailSheet(private val context: Context) {

    private val dialog = BottomSheetDialog(context)
    private val b = SheetDetailBinding.inflate(LayoutInflater.from(context))

    init {
        dialog.setContentView(b.root)
        dialog.setOnShowListener {
            dialog.behavior.state = BottomSheetBehavior.STATE_EXPANDED
            dialog.behavior.skipCollapsed = true
        }
    }

    fun title(title: String, sub: String? = null): DetailSheet {
        b.tvTitle.text = title
        if (sub.isNullOrEmpty()) b.tvSub.visibility = View.GONE else b.tvSub.text = sub
        return this
    }

    /** [colorRes] is a colour resource id, e.g. R.color.green. */
    fun chip(label: String, colorRes: Int): DetailSheet {
        b.tvChip.visibility = View.VISIBLE
        b.tvChip.applyChip(label, ContextCompat.getColor(context, colorRes))
        return this
    }

    fun line(label: String, value: String): DetailSheet {
        val l = ItemLineBinding.inflate(LayoutInflater.from(context), b.body, false)
        l.tvLabel.text = label
        l.tvValue.text = value
        b.body.addView(l.root)
        return this
    }

    fun action(label: String, style: ActionStyle = ActionStyle.OUTLINE, icon: Int = 0, onClick: () -> Unit): DetailSheet {
        val btn = if (style == ActionStyle.PRIMARY) {
            MaterialButton(context)
        } else {
            MaterialButton(context, null, com.google.android.material.R.attr.materialButtonOutlinedStyle)
        }
        btn.text = label
        btn.isAllCaps = false
        btn.textSize = 14f
        btn.cornerRadius = context.dp(14)
        btn.layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, context.dp(52)).apply {
            topMargin = context.dp(8)
        }
        val red = ContextCompat.getColor(context, R.color.red)
        when (style) {
            ActionStyle.DANGER -> {
                btn.setTextColor(red)
                btn.strokeColor = ColorStateList.valueOf(0x66EF6A5B)
                btn.iconTint = ColorStateList.valueOf(red)
            }
            ActionStyle.OUTLINE -> {
                btn.setTextColor(ContextCompat.getColor(context, R.color.text))
                btn.strokeColor = ColorStateList.valueOf(ContextCompat.getColor(context, R.color.line2))
                btn.iconTint = ColorStateList.valueOf(ContextCompat.getColor(context, R.color.amber))
            }
            ActionStyle.PRIMARY -> Unit
        }
        if (icon != 0) {
            btn.setIconResource(icon)
            btn.iconGravity = MaterialButton.ICON_GRAVITY_TEXT_START
        }
        btn.setOnClickListener {
            dialog.dismiss()
            onClick()
        }
        b.actions.addView(btn)
        return this
    }

    fun show() = dialog.show()
}
