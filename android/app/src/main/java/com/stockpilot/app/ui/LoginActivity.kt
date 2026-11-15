package com.stockpilot.app.ui

import android.content.Intent
import android.os.Bundle
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
        b.btnLogin.setOnClickListener { submit() }
        b.tvToggle.setOnClickListener { setMode(!registerMode) }
        setMode(false)
    }

    private fun setMode(register: Boolean) {
        registerMode = register
        b.tvError.visibility = View.GONE
        b.tilName.visibility = if (register) View.VISIBLE else View.GONE
        b.tvTitle.text = if (register) "Create account." else "Sign in."
        b.tvSub.text = if (register) "New accounts start as staff." else "Open your inventory workspace."
        b.btnLogin.text = if (register) "Create account" else "Sign in"
        b.tvToggle.text = if (register) "Already have an account? Sign in" else "New here? Create an account"
        b.tvDemo.visibility = if (register) View.GONE else View.VISIBLE
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
