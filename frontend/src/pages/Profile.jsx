import { useState } from 'react'
import { KeyRound, LogOut } from 'lucide-react'
import api, { errMsg } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { PageHeader, Field, Chip } from '../components/ui'

export default function Profile() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErrors({ ...errors, [k]: '' }) }

  const submit = async (e) => {
    e.preventDefault()
    const er = {}
    if (!f.currentPassword) er.currentPassword = 'Enter your current password'
    if (f.newPassword.length < 8) er.newPassword = 'At least 8 characters'
    if (f.confirm !== f.newPassword) er.confirm = 'Passwords do not match'
    setErrors(er)
    if (Object.keys(er).length) return
    setSaving(true)
    try {
      await api.put('/auth/password', { currentPassword: f.currentPassword, newPassword: f.newPassword })
      toast.success('Password updated')
      setF({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) { toast.error(errMsg(err)) } finally { setSaving(false) }
  }

  return (
    <>
      <PageHeader eyebrow="ACCOUNT" title="My account" subtitle="Your profile and security." />
      <div className="grid-2">
        <div className="panel profile-card">
          <div className="avatar lg">{user.name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}</div>
          <h2>{user.name}</h2>
          <p className="muted">{user.email}</p>
          <Chip kind={user.role} />
          <button className="btn btn-ghost" onClick={logout}><LogOut size={16} /> Sign out</button>
        </div>
        <form className="panel stack" onSubmit={submit} noValidate>
          <div className="panel-head"><div><h2>Change password</h2><p>Use at least 8 characters.</p></div><KeyRound size={20} className="muted" /></div>
          <Field label="Current password" error={errors.currentPassword}>{(id) => <input id={id} type="password" autoComplete="current-password" value={f.currentPassword} onChange={set('currentPassword')} />}</Field>
          <Field label="New password" error={errors.newPassword}>{(id) => <input id={id} type="password" autoComplete="new-password" value={f.newPassword} onChange={set('newPassword')} />}</Field>
          <Field label="Confirm new password" error={errors.confirm}>{(id) => <input id={id} type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} />}</Field>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Updating…' : 'Update password'}</button>
        </form>
      </div>
    </>
  )
}
