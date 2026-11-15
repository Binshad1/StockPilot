package com.stockpilot.app.ui

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.stockpilot.app.R
import com.stockpilot.app.data.Session
import com.stockpilot.app.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var b: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityMainBinding.inflate(layoutInflater)
        setContentView(b.root)

        b.toolbar.inflateMenu(R.menu.menu_main)
        b.toolbar.setOnMenuItemClickListener {
            if (it.itemId == R.id.action_logout) forceLogout()
            true
        }

        b.bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_dashboard -> show(DashboardFragment(), "Overview")
                R.id.nav_products -> show(ProductsFragment(), "Products")
                R.id.nav_orders -> show(OrdersFragment(), "Orders")
                R.id.nav_customers -> show(CustomersFragment(), "Customers")
            }
            true
        }
        if (savedInstanceState == null) b.bottomNav.selectedItemId = R.id.nav_dashboard
    }

    private fun show(fragment: Fragment, title: String) {
        b.toolbar.title = title
        supportFragmentManager.beginTransaction().replace(R.id.container, fragment).commit()
    }

    /** Clears the session and returns to the login screen (sign out, or token expired). */
    fun forceLogout() {
        Session.clear(this)
        startActivity(Intent(this, LoginActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK or Intent.FLAG_ACTIVITY_NEW_TASK))
        finish()
    }
}
