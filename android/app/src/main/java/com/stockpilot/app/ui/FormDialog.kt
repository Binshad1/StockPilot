package com.stockpilot.app.ui

import android.content.Context
import android.content.DialogInterface
import android.text.InputType
import android.view.LayoutInflater
import android.widget.LinearLayout
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.stockpilot.app.databinding.DialogFormBinding

class Field(
    val key: String,
    val label: String,
    val number: Boolean = false,
    val required: Boolean = false,
    val default: String = "",
    val secret: Boolean = false
)

/**
 * Builds a form dialog from a list of fields, validates the required ones and hands the values to
 * [onSubmit] (key -> text). The dialog stays open if validation fails.
 */
object FormDialog {
    fun show(context: Context, title: String, positive: String, fields: List<Field>, onSubmit: (Map<String, String>) -> Unit) {
        val form = DialogFormBinding.inflate(LayoutInflater.from(context))
        val inputs = mutableMapOf<String, Pair<TextInputLayout, TextInputEditText>>()

        fields.forEach { f ->
            val layout = TextInputLayout(context, null, com.google.android.material.R.attr.textInputOutlinedStyle).apply {
                hint = f.label + if (f.required) " *" else ""
                val r = context.dp(12).toFloat()
                setBoxCornerRadii(r, r, r, r)
                layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                    .apply { topMargin = context.dp(8) }
                if (f.secret) endIconMode = TextInputLayout.END_ICON_PASSWORD_TOGGLE
            }
            val edit = TextInputEditText(layout.context).apply {
                inputType = when {
                    f.secret -> InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
                    f.number -> InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
                    else -> InputType.TYPE_CLASS_TEXT
                }
                setText(f.default)
                maxLines = 1
            }
            layout.addView(edit)
            form.formRoot.addView(layout)
            inputs[f.key] = layout to edit
        }

        val dialog = MaterialAlertDialogBuilder(context)
            .setTitle(title)
            .setView(form.root)
            .setNegativeButton("Cancel", null)
            .setPositiveButton(positive, null) // set below so the dialog stays open when validation fails
            .create()

        dialog.setOnShowListener {
            dialog.getButton(DialogInterface.BUTTON_POSITIVE).setOnClickListener {
                var ok = true
                val values = mutableMapOf<String, String>()
                fields.forEach { f ->
                    val (layout, edit) = inputs.getValue(f.key)
                    val text = if (f.secret) edit.text.toString() else edit.text.toString().trim()
                    layout.error = if (f.required && text.isEmpty()) "Required".also { ok = false } else null
                    values[f.key] = text
                }
                if (ok) {
                    dialog.dismiss()
                    onSubmit(values)
                }
            }
        }
        dialog.show()
    }
}
