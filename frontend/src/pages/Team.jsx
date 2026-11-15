import { useState } from 'react'
import { UserPlus, ShieldCheck } from 'lucide-react'
import api, { errMsg } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useApi } from '../utils/hooks'
import { fmtDate } from '../utils/format'
import { PageHeader, Chip, Modal, Field, ErrorState, Skeleton } from '../components/ui'

export default function Team() {
  const { user: me } = useAuth()
  const toast = useToast()
  const { data, loading, error, reload } = useApi(() => api.get('/users'), [])
  const [adding, setAdding] = useState(false)

  const patch = async (u, body, msg) => {
    try { await api.patch(`/users/${u.id}`, body); toast.success(msg); reload() } catch (err) { toast.error(errMsg(err)) }
  }

  return (
    <>
      <PageHeader eyebrow="ACCESS" title="Team" subtitle="Control who can sign in and what they can do.">
        <button className="btn btn-primary" onClick={() => setAdding(true)}><UserPlus size={17} /> Add user</button>
      </PageHeader>
      <div className="role-note panel">
        <ShieldCheck size={18} />
        <p><b>Admin</b> can manage products, users, reports and cancel orders. <b>Staff</b> can view products, adjust stock, manage customers and create orders.</p>
      </div>
      <div className="panel flush">
        {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <Skeleton rows={4} /> : (
          <div className="table-wrap">
            <table className="rtable">
              <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th /></tr></thead>
              <tbody>
                {data.map((u) => {
                  const self = u.id === me.id
                  return (
                    <tr key={u.id}>
                      <td data-label="User"><div className="cell-product"><div className="avatar sm">{u.name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}</div><div><b>{u.name}{self && <em className="you"> you</em>}</b><small>{u.email}</small></div></div></td>
                      <td data-label="Role"><Chip kind={u.role} /></td>
                      <td data-label="Status"><Chip kind={u.isActive ? 'active' : 'disabled'} /></td>
                      <td data-label="Joined" className="muted">{fmtDate(u.createdAt)}</td>
                      <td className="actions-col wide">
                        {!self && (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => patch(u, { role: u.role === 'admin' ? 'staff' : 'admin' }, `${u.name} is now ${u.role === 'admin' ? 'staff' : 'an admin'}`)}>Make {u.role === 'admin' ? 'staff' : 'admin'}</button>
                            <button className={`btn btn-sm ${u.isActive ? 'btn-danger-ghost' : 'btn-ghost'}`} onClick={() => patch(u, { isActive: !u.isActive }, u.isActive ? 'User disabled' : 'User enabled')}>{u.isActive ? 'Disable' : 'Enable'}</button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {adding && <AddUser onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload() }} />}
    </>
  )
}

function AddUser({ onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'staff' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErrors({ ...errors, [k]: '' }) }

  const submit = async (e) => {
    e.preventDefault()
    const er = {}
    if (f.name.trim().length < 2) er.name = 'Enter a name'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'Enter a valid email'
    if (f.password.length < 8) er.password = 'At least 8 characters'
    setErrors(er)
    if (Object.keys(er).length) return
    setSaving(true)
    try { await api.post('/users', f); toast.success('User created'); onSaved() } catch (err) { toast.error(errMsg(err)); setSaving(false) }
  }

  return (
    <Modal icon={UserPlus} title="Add user" subtitle="They can sign in straight away." onClose={saving ? () => {} : onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button><button form="user-form" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create user'}</button></>}>
      <form id="user-form" className="stack" onSubmit={submit} noValidate>
        <Field label="Full name" required error={errors.name}>{(id) => <input id={id} value={f.name} onChange={set('name')} autoFocus />}</Field>
        <Field label="Email" required error={errors.email}>{(id) => <input id={id} type="email" value={f.email} onChange={set('email')} />}</Field>
        <div className="form-grid">
          <Field label="Temporary password" required error={errors.password}>{(id) => <input id={id} type="text" value={f.password} onChange={set('password')} autoComplete="off" />}</Field>
          <Field label="Role">{(id) => <select id={id} value={f.role} onChange={set('role')}><option value="staff">Staff</option><option value="admin">Admin</option></select>}</Field>
        </div>
      </form>
    </Modal>
  )
}
