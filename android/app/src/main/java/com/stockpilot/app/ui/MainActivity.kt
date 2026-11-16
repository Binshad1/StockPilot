package com.stockpilot.app.ui

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.stockpilot.app.R
import com.stockpilot.app.data.Net
import com.stockpilot.app.data.PasswordRequest
import com.stockpilot.app.data.Session
import com.stockpilot.app.databinding.ActivityMainBinding
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var b: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityMainBinding.inflate(layoutInflater)
        setContentView(b.root)

        val user = Session.user(this)
        b.tvAvatar.text = (user?.name ?: "?").initials()
        val admin = Session.isAdmin(this)
        b.tvRole.applyChip(
            if (admin) "ADMIN" else "STAFF",
            ContextCompat.getColor(this, if (admin) R.color.amber else R.color.muted)
        )
        b.tvAvatar.setOnClickListener { showMore() }

        b.bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_dashboard -> { show(DashboardFragment(), "Overview"); true }
                R.id.nav_products -> { show(ProductsFragment(), "Products"); true }
                R.id.nav_orders -> { show(OrdersFragment(), "Orders"); true }
                R.id.nav_customers -> { show(CustomersFragment(), "Customers"); true }
                R.id.nav_more -> { showMore(); false } // opens a sheet, keeps the current tab selected
                else -> false
            }
        }
        if (savedInstanceState == null) b.bottomNav.selectedItemId = R.id.nav_dashboard
    }

    private fun show(fragment: Fragment, title: String) {
        b.tvTitle.text = title
        supportFragmentManager.beginTransaction().replace(R.id.container, fragment).commit()
    }

    fun selectTab(id: Int) {
        b.bottomNav.selectedItemId = id
    }

    /** Red/amber number on the Products tab showing how many items need restocking. */
    fun setLowStockBadge(count: Int) {
        if (count > 0) {
            val badge = b.bottomNav.getOrCreateBadge(R.id.nav_products)
            badge.number = count
            badge.backgroundColor = ContextCompat.getColor(this, R.color.amber)
            badge.badgeTextColor = ContextCompat.getColor(this, R.color.amber_ink)
        } else {
            b.bottomNav.removeBadge(R.id.nav_products)
        }
    }

    /** Account sheet. Admins also see Reports and Team here; staff don't. */
    private fun showMore() {
        val user = Session.user(this)
        val admin = Session.isAdmin(this)
        val sheet = DetailSheet(this)
            .title(user?.name ?: "Account", user?.email)
            .chip(if (admin) "ADMIN" else "STAFF", if (admin) R.color.amber else R.color.muted)

        if (admin) {
            sheet.action("Reports", ActionStyle.OUTLINE, R.drawable.ic_chart) {
                startActivity(Intent(this, ReportsActivity::class.java))
            }
            sheet.action("Team and roles", ActionStyle.OUTLINE, R.drawable.ic_shield) {
                startActivity(Intent(this, TeamActivity::class.java))
            }
        }
        sheet.action("Change password", ActionStyle.OUTLINE, R.drawable.ic_key) { changePassword() }
        sheet.action("Sign out", ActionStyle.DANGER, R.drawable.ic_logout) { forceLogout() }
        sheet.show()
    }

    private fun changePassword() {
        FormDialog.show(
            this, "Change password", "Update",
            listOf(
                Field("current", "Current password", required = true, secret = true),
                Field("new", "New password (min 8)", required = true, secret = true),
                Field("confirm", "Confirm new password", required = true, secret = true)
            )
        ) { v ->
            when {
                v.getValue("new").length < 8 -> toastShort("New password must be at least 8 characters")
                v.getValue("new") != v.getValue("confirm") -> toastShort("Passwords do not match")
                else -> lifecycleScope.launch {
                    try {
                        Net.api(this@MainActivity).changePassword(PasswordRequest(v.getValue("current"), v.getValue("new")))
                        toastShort("Password updated")
                    } catch (e: Exception) {
                        toastShort(e.friendlyMessage())
                    }
                }
            }
        }
    }

    private fun toastShort(msg: String) = android.widget.Toast.makeText(this, msg, android.widget.Toast.LENGTH_LONG).show()

    /** Clears the session and returns to the login screen (sign out, or token expired). */
    fun forceLogout() {
        Session.clear(this)
        startActivity(Intent(this, LoginActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK or Intent.FLAG_ACTIVITY_NEW_TASK))
        finish()
    }
}
