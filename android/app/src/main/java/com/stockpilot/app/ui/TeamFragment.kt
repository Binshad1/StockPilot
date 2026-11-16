package com.stockpilot.app.ui

import com.stockpilot.app.R
import com.stockpilot.app.data.Net
import com.stockpilot.app.data.NewUserRequest
import com.stockpilot.app.data.Session
import com.stockpilot.app.data.TeamUser
import com.stockpilot.app.data.UserPatch

/** Admin only: see everyone who can sign in, promote/demote, disable/enable, add staff. */
class TeamFragment : ListFragment() {
    override val searchHint = "Search name or email"
    override val emptyText = "No users found"
    override val fabLabel = "Add user"

    override suspend fun loadRows(query: String, filter: String): List<Row> =
        Net.api(requireContext()).users()
            .filter { query.isEmpty() || it.name.contains(query, true) || it.email.contains(query, true) }
            .map { u ->
                val active = u.isActive != false
                Row(
                    title = u.name,
                    sub = u.email,
                    end = if (active) "ACTIVE" else "DISABLED",
                    chip = u.role.uppercase(),
                    chipColor = if (u.role == "admin") R.color.amber else R.color.muted,
                    badge = u.name.initials()
                ) { showUser(u) }
            }

    private fun showUser(u: TeamUser) {
        val ctx = requireContext()
        val me = Session.user(ctx)?.id == u.id
        val active = u.isActive != false
        val sheet = DetailSheet(ctx)
            .title(u.name + if (me) " (you)" else "", u.email)
            .chip(u.role.uppercase(), if (u.role == "admin") R.color.amber else R.color.muted)
            .line("Role", if (u.role == "admin") "Administrator" else "Staff")
            .line("Status", if (active) "Active" else "Disabled")
            .line("Joined", u.createdAt?.shortDate() ?: "-")

        if (me) {
            sheet.line("Note", "You can't change your own role")
        } else {
            val newRole = if (u.role == "admin") "staff" else "admin"
            sheet.action("Make ${if (newRole == "admin") "admin" else "staff"}", ActionStyle.PRIMARY, R.drawable.ic_shield) {
                patch(u, UserPatch(role = newRole), "${u.name} is now $newRole")
            }
            sheet.action(
                if (active) "Disable account" else "Enable account",
                if (active) ActionStyle.DANGER else ActionStyle.OUTLINE
            ) {
                patch(u, UserPatch(isActive = !active), if (active) "${u.name} disabled" else "${u.name} enabled")
            }
        }
        sheet.show()
    }

    private fun patch(u: TeamUser, body: UserPatch, message: String) {
        launchApi {
            Net.api(requireContext()).patchUser(u.id, body)
            toast(message)
            refresh()
        }
    }

    override fun onFabClick() {
        FormDialog.show(
            requireContext(), "Add user", "Create",
            listOf(
                Field("name", "Full name", required = true),
                Field("email", "Email", required = true),
                Field("password", "Temporary password (min 8)", required = true, secret = true)
            )
        ) { v ->
            if (v.getValue("password").length < 8) {
                toast("Password must be at least 8 characters")
                return@show
            }
            launchApi {
                Net.api(requireContext()).addUser(NewUserRequest(v.getValue("name"), v.getValue("email"), v.getValue("password"), "staff"))
                toast("User created as staff. Tap them to make admin.")
                refresh()
            }
        }
    }
}
