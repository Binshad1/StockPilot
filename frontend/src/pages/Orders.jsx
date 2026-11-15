import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCheck, Plus, ReceiptText, ShoppingCart, XCircle } from 'lucide-react'
import api, { errMsg } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useApi, useDebounce, usePage } from '../utils/hooks'
import { fmtDate, inr, num } from '../utils/format'
import { PageHeader, SearchInput, Chip, Pagination, Modal, ConfirmDialog, EmptyState, ErrorState, Skeleton, Thumb } from '../components/ui'

const LIMIT = 10
const TABS = [['', 'All'], ['pending', 'Pending'], ['completed', 'Completed'], ['cancelled', 'Cancelled']]

export default function Orders() {
  const nav = useNavigate()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState(null)
  const q = useDebounce(search)
  const [page, setPage] = usePage(`${q}|${status}`)
  const { data, loading, error, reload } = useApi(() => api.get('/orders', { params: { status, q, page, limit: LIMIT } }), [status, q, page])

  return (
    <>
      <PageHeader eyebrow="SALES" title="Orders" subtitle="Creating an order automatically takes the items out of stock.">
        <button className="btn btn-primary" onClick={() => nav('/orders/new')}><Plus size={17} /> New order</button>
      </PageHeader>

      <div className="toolbar">
        <div className="tabs inline" role="tablist">
          {TABS.map(([v, l]) => <button key={l} role="tab" aria-selected={status === v} className={status === v ? 'on' : ''} onClick={() => setStatus(v)}>{l}</button>)}
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search order no. or customer…" />
      </div>

      <div className="panel flush">
        {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <Skeleton rows={6} /> : data.data.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No orders found" text={q || status ? 'Try changing the filters.' : 'Create your first order to see it here.'}
            action={!q && !status && <button className="btn btn-primary" onClick={() => nav('/orders/new')}><Plus size={16} /> New order</button>} />
        ) : (
          <div className={`table-wrap ${loading ? 'is-loading' : ''}`}>
            <table className="rtable">
              <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th className="num">Items</th><th className="num">Total</th><th>Status</th></tr></thead>
              <tbody>
                {data.data.map((o) => (
                  <tr key={o._id} className="clickable" onClick={() => setOpenId(o._id)}>
                    <td data-label="Order" className="mono"><b>{o.orderNumber}</b></td>
                    <td data-label="Customer">{o.customerName}</td>
                    <td data-label="Date" className="muted">{fmtDate(o.createdAt, true)}</td>
                    <td data-label="Items" className="num mono">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                    <td data-label="Total" className="num mono">{inr(o.total)}</td>
                    <td data-label="Status"><Chip kind={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} pages={data.pages} total={data.total} limit={LIMIT} onChange={setPage} />}
      </div>

      {openId && <OrderDetail id={openId} onClose={() => setOpenId(null)} onChanged={reload} />}
    </>
  )
}

function OrderDetail({ id, onClose, onChanged }) {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const { data: o, loading, reload } = useApi(() => api.get(`/orders/${id}`), [id])
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const change = async (status) => {
    setBusy(true)
    try {
      await api.patch(`/orders/${id}/status`, { status })
      toast.success(status === 'cancelled' ? 'Order cancelled · stock returned' : 'Order marked as completed')
      setConfirm(null)
      reload(); onChanged()
    } catch (err) { toast.error(errMsg(err)); setConfirm(null) } finally { setBusy(false) }
  }

  return (
    <>
      <Modal wide icon={ReceiptText} title={o ? o.orderNumber : 'Order'} subtitle={o ? `${fmtDate(o.createdAt, true)} · by ${o.createdByName || 'staff'}` : ''} onClose={onClose}
        footer={o && o.status !== 'cancelled' && (
          <>
            {isAdmin && <button className="btn btn-danger-ghost" onClick={() => setConfirm('cancelled')}><XCircle size={16} /> Cancel order</button>}
            {o.status === 'pending' && <button className="btn btn-primary" onClick={() => setConfirm('completed')}><CheckCheck size={16} /> Mark completed</button>}
          </>
        )}>
        {loading || !o ? <Skeleton rows={4} /> : (
          <div className="stack">
            <div className="order-meta">
              <div><span>CUSTOMER</span><b>{o.customerName}</b></div>
              <div><span>STATUS</span><Chip kind={o.status} /></div>
              <div><span>ITEMS</span><b>{num(o.items.reduce((s, i) => s + i.quantity, 0))}</b></div>
            </div>
            <ul className="line-list">
              {o.items.map((i) => (
                <li key={i.product}>
                  <Thumb name={i.name} size={38} />
                  <div><b>{i.name}</b><small className="mono">{i.sku} · {inr(i.price)} each</small></div>
                  <span className="mono qty">× {i.quantity}</span>
                  <span className="mono">{inr(i.price * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="totals">
              <div><span>Subtotal</span><b className="mono">{inr(o.subtotal)}</b></div>
              {o.discount > 0 && <div><span>Discount</span><b className="mono">− {inr(o.discount)}</b></div>}
              <div className="grand"><span>Total</span><b className="mono">{inr(o.total)}</b></div>
            </div>
            {o.notes && <p className="note-box">{o.notes}</p>}
          </div>
        )}
      </Modal>
      {confirm && (
        <ConfirmDialog busy={busy} danger={confirm === 'cancelled'} onClose={() => setConfirm(null)} onConfirm={() => change(confirm)}
          title={confirm === 'cancelled' ? 'Cancel this order?' : 'Mark as completed?'} confirmLabel={confirm === 'cancelled' ? 'Cancel order' : 'Complete order'}
          message={confirm === 'cancelled' ? 'The items will be returned to stock. This can’t be undone.' : 'Use this once the customer has received the order.'} />
      )}
    </>
  )
}
