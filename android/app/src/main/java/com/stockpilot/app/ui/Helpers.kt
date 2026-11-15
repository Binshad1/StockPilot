package com.stockpilot.app.ui

import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.stockpilot.app.data.Session
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import org.json.JSONObject
import retrofit2.HttpException
import java.io.IOException
import java.text.NumberFormat
import java.util.Locale

fun Double.inr(): String = "₹" + NumberFormat.getNumberInstance(Locale("en", "IN")).apply {
    maximumFractionDigits = 2
}.format(this)

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
