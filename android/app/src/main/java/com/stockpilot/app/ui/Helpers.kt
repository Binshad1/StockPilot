package com.stockpilot.app.ui

import android.content.Context
import android.graphics.drawable.GradientDrawable
import android.widget.TextView
import android.widget.Toast
import androidx.core.graphics.ColorUtils
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.stockpilot.app.data.Session
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import org.json.JSONObject
import retrofit2.HttpException
import java.io.IOException
import java.text.NumberFormat
import java.time.LocalDate
import java.util.Locale

fun Double.inr(): String = "₹" + NumberFormat.getNumberInstance(Locale("en", "IN")).apply {
    maximumFractionDigits = 2
}.format(this)

/** Short money: ₹1.25 L, ₹3.4 K. */
fun Double.inrShort(): String = when {
    this >= 10_000_000 -> "₹" + String.format(Locale.ENGLISH, "%.2f Cr", this / 10_000_000)
    this >= 100_000 -> "₹" + String.format(Locale.ENGLISH, "%.2f L", this / 100_000)
    else -> inr()
}

/** Turns any error into a short message for the user (uses the API's own message when there is one). */
fun Throwable.friendlyMessage(): String = when (this) {
    is HttpException -> try {
        JSONObject(response()?.errorBody()?.string() ?: "").optString("message", "Request failed (${code()})")
    } catch (e: Exception) {
        "Request failed (${code()})"
    }
    is IOException -> "Cannot reach the server (${message ?: javaClass.simpleName}). Check your internet and the API URL."
    else -> message ?: "Something went wrong"
}

/** ISO date from the API -> "14 Nov 2026". */
fun String.shortDate(): String = try {
    val d = java.time.OffsetDateTime.parse(this)
    d.format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH))
} catch (e: Exception) {
    take(10)
}

/** "2026-11-14" -> "14 Nov" / "Sat". */
fun String.dayMonth(): String = try {
    val d = LocalDate.parse(take(10))
    d.format(java.time.format.DateTimeFormatter.ofPattern("dd MMM", Locale.ENGLISH))
} catch (e: Exception) {
    take(10)
}

fun String.weekday(): String = try {
    LocalDate.parse(take(10)).format(java.time.format.DateTimeFormatter.ofPattern("EEE", Locale.ENGLISH))
} catch (e: Exception) {
    take(3)
}

fun String.initials(): String =
    trim().split(" ").filter { it.isNotEmpty() }.take(2).joinToString("") { it.first().uppercase() }.ifEmpty { "?" }

/** Coloured pill with a dot: "● LOW STOCK". [color] is a real ARGB colour (not a resource id). */
fun TextView.applyChip(label: String, color: Int) {
    text = "● $label"
    setTextColor(color)
    val d = resources.displayMetrics.density
    background = GradientDrawable().apply {
        cornerRadius = 40f * d
        setColor(ColorUtils.setAlphaComponent(color, 32))
        setStroke((1f * d).toInt().coerceAtLeast(1), ColorUtils.setAlphaComponent(color, 100))
    }
}

fun Context.dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

/**
 * Runs an API call safely inside the fragment's lifecycle:
 * 401 -> back to login, any other error -> toast.
 */
fun Fragment.launchApi(block: suspend () -> Unit) {
    viewLifecycleOwner.lifecycleScope.launch {
        try {
            block()
        } catch (e: CancellationException) {
            throw e
        } catch (e: HttpException) {
            if (e.code() == 401) {
                (activity as? MainActivity)?.forceLogout()
            } else {
                toast(e.friendlyMessage())
            }
        } catch (e: Exception) {
            toast(e.friendlyMessage())
        }
    }
}

fun Fragment.toast(msg: String) {
    context?.let { Toast.makeText(it, msg, Toast.LENGTH_LONG).show() }
}

fun Fragment.isAdmin(): Boolean = context?.let { Session.isAdmin(it) } ?: false
