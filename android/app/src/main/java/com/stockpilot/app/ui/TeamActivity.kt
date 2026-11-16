package com.stockpilot.app.ui

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.stockpilot.app.data.Session
import com.stockpilot.app.databinding.ActivityHostBinding

/** Hosts the admin-only team list full screen. */
class TeamActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (!Session.isAdmin(this)) { // never show this screen to staff
            finish()
            return
        }
        val b = ActivityHostBinding.inflate(layoutInflater)
        setContentView(b.root)
        b.tvEyebrow.text = "◆ ACCESS · ADMIN"
        b.tvTitle.text = "Team"
        b.btnBack.setOnClickListener { finish() }
        if (savedInstanceState == null) {
            supportFragmentManager.beginTransaction().replace(b.host.id, TeamFragment()).commit()
        }
    }
}
