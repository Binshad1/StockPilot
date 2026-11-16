package com.stockpilot.app.ui

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.text.SpannableString
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.util.Patterns
import android.view.View
import android.view.inputmethod.InputMethodManager
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.stockpilot.app.data.LoginRequest
import com.stockpilot.app.data.Net
import com.stockpilot.app.data.RegisterRequest
import com.stockpilot.app.data.Session
import com.stockpilot.app.databinding.ActivityLoginBinding
import kotlinx.coroutines.launch

/** Sign in, or create a new (staff) account. The first account in an empty database becomes admin. */
class LoginActivity : AppCompatActivity() {

    private lateinit var b: ActivityLoginBinding
    private var registerMode = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Already signed in? Skip the login screen.
        if (Session.token(this) != null) {
            openMain()
            return
        }

        b = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(b.root)

        // "actually" in amber, like the web app
        val headline = "Know what you have.\nSell what you actually have."
        val span = SpannableString(headline)
        val start = headline.indexOf("actually")
        span.setSpan(ForegroundColorSpan(Color.parseColor("#F0A742")), start, start + "actually".length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        b.tvHeadline.text = span

        b.btnLogin.setOnClickListener { submit() }
        b.toggleMode.addOnButtonCheckedListener { _, id, isChecked ->
            if (isChecked) setMode(id == b.btnModeRegister.id)
        }
        b.toggleMode.check(b.btnModeLogin.id)

        // demo accounts so a reviewer can try both roles with one tap
        b.btnDemoAdmin.setOnClickListener { fill("admin@stockpilot.com", "Admin@123") }
        b.btnDemoStaff.setOnClickListener { fill("staff@stockpilot.com", "Staff@123") }
    }

    private fun fill(email: String, password: String) {
        b.etEmail.setText(email)
        b.etPassword.setText(password)
    }

    private fun setMode(register: Boolean) {
        registerMode = register
        b.tvError.visibility = View.GONE
        b.tilName.visibility = if (register) View.VISIBLE else View.GONE
        b.tvEyebrow.text = if (register) "◆ CREATE ACCOUNT" else "◆ WELCOME BACK"
        b.tvTitle.text = if (register) "Get started." else "Sign in."
        b.tvSub.text = if (register) "New accounts start as staff. An admin can change your role." else "Enter your details to open your workspace."
        b.btnLogin.text = if (register) "Create account" else "Sign in"
        b.demoBox.visibility = if (register) View.GONE else View.VISIBLE
    }

    private fun submit() {
        val name = b.etName.text.toString().trim()
        val email = b.etEmail.text.toString().trim()
        val password = b.etPassword.text.toString()

        // Client-side validation (the server validates again)
        when {
            registerMode && name.length < 2 -> return showError("Enter your full name")
            !Patterns.EMAIL_ADDRESS.matcher(email).matches() -> return showError("Enter a valid email address")
            registerMode && password.length < 8 -> return showError("Password must be at least 8 characters")
            password.isEmpty() -> return showError("Enter your password")
        }

        (getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager).hideSoftInputFromWindow(b.root.windowToken, 0)
        setLoading(true)
        lifecycleScope.launch {
            try {
                val api = Net.api(this@LoginActivity)
                val auth = if (registerMode) api.register(RegisterRequest(name, email, password)) else api.login(LoginRequest(email, password))
                Session.save(this@LoginActivity, auth)
                openMain()
            } catch (e: Exception) {
                setLoading(false)
                showError(e.friendlyMessage())
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        b.btnLogin.isEnabled = !loading
        b.btnLogin.text = when {
            loading -> "Please wait…"
            registerMode -> "Create account"
            else -> "Sign in"
        }
        if (loading) b.tvError.visibility = View.GONE
    }

    private fun showError(msg: String) {
        b.tvError.text = msg
        b.tvError.visibility = View.VISIBLE
    }

    private fun openMain() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
}
