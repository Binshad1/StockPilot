import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, MapPin, Pencil, Phone, Plus, ShoppingCart, Trash2, UserPlus, Users } from 'lucide-react'
import api, { errMsg } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useApi, useDebounce, usePage } from '../utils/hooks'
import { fmtDate, inr } from '../utils/format'
import { PageHeader, SearchInput, Pagination, Modal, ConfirmDialog, Field, EmptyState, ErrorState, Skeleton, Chip } from '../components/ui'

const LIMIT = 10
const EMPTY = { name: '', email: '', phone: '', address: '', notes: '' }
const initials = (n) => n.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()

export default function Customers() {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const q = useDebounce(search)
  const [page, setPage] = usePage(q)
  const { data, loading, error, reload } = useApi(() => api.get('/customers', { params: { q, page, limit: LIMIT } }), [q, page])

  const remove = async () => {
    setBusy(true)
    try {
      await api.delete(`/customers/${deleting._id}`)
      toast.success('Customer deleted')
      setDeleting(null)
      if (data.data.length === 1 && page > 1) setPage(page - 1); else reload()
    } catch (err) { toast.error(errMsg(err)); setDeleting(null) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader eyebrow="PEOPLE" title="Customers" subtitle="Keep your buyers and their order history in one place.">
        <button className="btn btn-primary" onClick={() => setEditing('new')}><UserPlus size={17} /> Add customer</button>
      </PageHeader>
      <div className="toolbar"><SearchInput value={search} onChange={setSearch} placeholder="Search name, email or phone…" /></div>

      <div className="panel flush">
        {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <Skeleton rows={6} /> : data.data.length === 0 ? (
          <EmptyState icon={Users} title={q ? 'No customers match' : 'No customers yet'} text={q ? 'Try a different search.' : 'Add your first customer to start tracking orders.'}
            action={!q && <button className="btn btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Add customer</button>} />
        ) : (
          <div className={`table-wrap ${loading ? 'is-loading' : ''}`}>
            <table className="rtable">
              <thead><tr><th>Customer</th><th>Contact</th><th className="num">Orders</th><th className="num">Total spent</th><th className="actions-col" /></tr></thead>
              <tbody>
                {data.data.map((c) => (
                  <tr key={c._id} className="clickable" onClick={() => setViewing(c)}>
                    <td data-label="Customer"><div className="cell-product"><div className="avatar sm">{initials(c.name)}</div><div><b>{c.name}</b>{c.address && <small>{c.address}</small>}</div></div></td>
                    <td data-label="Contact">{c.phone || '—'}{c.email && <small>{c.email}</small>}</td>
                    <td data-label="Orders" className="num mono">{c.orders}</td>
                    <td data-label="Total spent" className="num mono">{inr(c.totalSpent)}</td>
                    <td className="actions-col" onClick={(e) => e.stopPropagation()}>
                      <button className="icon-btn" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}><Pencil size={16} /></button>
                      {isAdmin && <button className="icon-btn danger" onClick={() => setDeleting(c)} aria-label={`Delete ${c.name}`}><Trash2 size={16} /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} pages={data.pages} total={data.total} limit={LIMIT} onChange={setPage} />}
      </div>

      {editing && <CustomerModal customer={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
      {viewing && <CustomerDetail id={viewing._id} onClose={() => setViewing(null)} onEdit={(c) => { setViewing(null); setEditing(c) }} />}
      {deleting && <ConfirmDialog danger busy={busy} title="Delete customer?" confirmLabel="Delete" onClose={() => setDeleting(null)} onConfirm={remove} message={<>“{deleting.name}” will be removed. Customers who already have orders can’t be deleted.</>} />}
    </>
  )
}

function CustomerModal({ customer, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(customer ? { ...EMPTY, ...customer } : EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setErrors({ ...errors, [k]: '' }) }

  const submit = async (e) => {
    e.preventDefault()
    const er = {}
    if (form.name.trim().length < 2) er.name = 'Enter the customer’s name'
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) er.email = 'Enter a valid email'
    if (form.phone && !/^[0-9+\-\s()]{6,20}$/.test(form.phone)) er.phone = 'Enter a valid phone number'
    setErrors(er)
    if (Object.keys(er).length) return
    setSaving(true)
    try {
      const body = { name: form.name, email: form.email, phone: form.phone, address: form.address, notes: form.notes }
      if (customer) await api.put(`/customers/${customer._id}`, body); else await api.post('/customers', body)
      toast.success(customer ? 'Customer updated' : 'Customer added')
      onSaved()
    } catch (err) { toast.error(errMsg(err)); setSaving(false) }
  }

  return (
    <Modal icon={UserPlus} title={customer ? 'Edit customer' : 'Add customer'} onClose={saving ? () => {} : onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button><button form="cust-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : customer ? 'Save changes' : 'Add customer'}</button></>}>
      <form id="cust-form" onSubmit={submit} className="stack" noValidate>
        <Field label="Name" required error={errors.name}>{(id) => <input id={id} value={form.name} onChange={set('name')} placeholder="e.g. Rahul Nair" autoFocus />}</Field>
        <div className="form-grid">
          <Field label="Phone" error={errors.phone}>{(id) => <input id={id} type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98470 00000" />}</Field>
          <Field label="Email" error={errors.email}>{(id) => <input id={id} type="email" value={form.email} onChange={set('email')} placeholder="name@example.com" />}</Field>
        </div>
        <Field label="Address">{(id) => <input id={id} value={form.address} onChange={set('address')} placeholder="Town, district" />}</Field>
        <Field label="Notes">{(id) => <textarea id={id} rows="2" maxLength="500" value={form.notes} onChange={set('notes')} placeholder="Optional" />}</Field>
      </form>
    </Modal>
  )
}

function CustomerDetail({ id, onClose, onEdit }) {
  const nav = useNavigate()
  const { data, loading } = useApi(() => api.get(`/customers/${id}`), [id])
  return (
    <Modal title={data?.name || 'Customer'} subtitle={data ? `Customer since ${fmtDate(data.createdAt)}` : ''} icon={Users} onClose={onClose}
      footer={data && <><button className="btn btn-ghost" onClick={() => onEdit(data)}><Pencil size={15} /> Edit</button><button className="btn btn-primary" onClick={() => nav(`/orders/new?customer=${id}`)}><ShoppingCart size={16} /> New order</button></>}>
      {loading || !data ? <Skeleton rows={3} /> : (
        <div className="stack">
          <div className="mini-stats"><div><span>ORDERS</span><b>{data.orders}</b></div><div><span>TOTAL SPENT</span><b>{inr(data.totalSpent)}</b></div></div>
          <ul className="contact-list">
            {data.phone && <li><Phone size={15} />{data.phone}</li>}
            {data.email && <li><Mail size={15} />{data.email}</li>}
            {data.address && <li><MapPin size={15} />{data.address}</li>}
          </ul>
          {data.notes && <p className="note-box">{data.notes}</p>}
          <h3 className="sub-h">Recent orders</h3>
          {data.recentOrders.length === 0 ? <p className="muted">No orders yet.</p> : (
            <ul className="mini-list">
              {data.recentOrders.map((o) => <li key={o._id}><b className="mono">{o.orderNumber}</b><span className="muted">{fmtDate(o.createdAt)}</span><span className="mono">{inr(o.total)}</span><Chip kind={o.status} /></li>)}
            </ul>
          )}
        </div>
      )}
    </Modal>
  )
}
