import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowDownToLine, ArrowUpFromLine, History, PackagePlus, TriangleAlert, ScrollText } from 'lucide-react'
import api, { errMsg } from '../api'
import { useToast } from '../context/ToastContext'
import { useApi, useDebounce, usePage } from '../utils/hooks'
import { fmtDate, num } from '../utils/format'
import { PageHeader, SearchInput, Chip, StockMeter, Thumb, Pagination, Modal, Field, EmptyState, ErrorState, Skeleton } from '../components/ui'

const LIMIT = 12
const REASONS = {
  in: [['purchase', 'Purchase / delivery'], ['return', 'Customer return'], ['adjustment', 'Stock count correction'], ['other', 'Other']],
  out: [['damaged', 'Damaged / expired'], ['adjustment', 'Stock count correction'], ['other', 'Other']],
}
const REASON_LABEL = { purchase: 'Purchase', return: 'Return', adjustment: 'Adjustment', damaged: 'Damaged', initial: 'Opening stock', order: 'Sold (order)', 'order-cancelled': 'Order cancelled', other: 'Other' }

export default function Inventory() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'alerts' ? 'alerts' : 'ledger'
  const [modal, setModal] = useState(null) // { type: 'in'|'out', product? }
  const [version, setVersion] = useState(0)
  const refresh = () => setVersion((v) => v + 1)

  return (
    <>
      <PageHeader eyebrow="STOCK CONTROL" title="Inventory" subtitle="Every unit in and out is recorded in the stock ledger.">
        <button className="btn btn-ghost" onClick={() => setModal({ type: 'out' })}><ArrowUpFromLine size={17} /> Stock out</button>
        <button className="btn btn-primary" onClick={() => setModal({ type: 'in' })}><ArrowDownToLine size={17} /> Stock in</button>
      </PageHeader>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'ledger'} className={tab === 'ledger' ? 'on' : ''} onClick={() => setParams({})}><History size={16} /> Stock ledger</button>
        <button role="tab" aria-selected={tab === 'alerts'} className={tab === 'alerts' ? 'on' : ''} onClick={() => setParams({ tab: 'alerts' })}><TriangleAlert size={16} /> Low-stock alerts</button>
      </div>

      {tab === 'ledger' ? <Ledger version={version} /> : <Alerts version={version} onRestock={(p) => setModal({ type: 'in', product: p })} />}

      {modal && <StockModal type={modal.type} product={modal.product} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh() }} />}
    </>
  )
}

function Ledger({ version }) {
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const q = useDebounce(search)
  const [page, setPage] = usePage(`${type}|${q}|${from}|${to}`)
  const { data, loading, error, reload } = useApi(() => api.get('/inventory/movements', { params: { type, q, from, to, page, limit: LIMIT } }), [type, q, from, to, page, version])

  return (
    <>
      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search product or SKU…" />
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Movement type">
          <option value="">In &amp; out</option><option value="in">Stock in only</option><option value="out">Stock out only</option>
        </select>
        <label className="date-pair"><span>From</span><input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="date-pair"><span>To</span><input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <div className="panel flush">
        {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <Skeleton rows={6} /> : data.data.length === 0 ? (
          <EmptyState icon={ScrollText} title="No movements found" text="Stock changes will appear here as they happen." />
        ) : (
          <div className={`table-wrap ${loading ? 'is-loading' : ''}`}>
            <table className="rtable">
              <thead><tr><th>When</th><th>Product</th><th>Movement</th><th className="num">Balance</th><th>Reason</th><th>By</th></tr></thead>
              <tbody>
                {data.data.map((m) => (
                  <tr key={m._id}>
                    <td data-label="When" className="mono muted">{fmtDate(m.createdAt, true)}</td>
                    <td data-label="Product"><b>{m.productName}</b><small className="mono">{m.sku}</small></td>
                    <td data-label="Movement"><span className={`move ${m.type}`}>{m.type === 'in' ? '▲ +' : '▼ −'}{num(m.quantity)}</span></td>
                    <td data-label="Balance" className="num mono">{num(m.balanceAfter)}</td>
                    <td data-label="Reason">{REASON_LABEL[m.reason] || m.reason}{m.note && <small>{m.note}</small>}</td>
                    <td data-label="By" className="muted">{m.userName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} pages={data.pages} total={data.total} limit={LIMIT} onChange={setPage} />}
      </div>
    </>
  )
}

function Alerts({ version, onRestock }) {
  const { data, loading, error, reload } = useApi(() => api.get('/inventory/low-stock'), [version])
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (loading && !data) return <Skeleton rows={4} />
  if (data.length === 0) return <div className="panel"><EmptyState icon={PackagePlus} title="Everything is stocked" text="No product is at or below its alert level." /></div>
  return (
    <div className="alert-grid">
      {data.map((p) => (
        <div key={p._id} className={`alert-card ${p.status}`}>
          <div className="hazard" />
          <div className="alert-top"><Thumb src={p.image} name={p.name} size={46} /><div><b>{p.name}</b><small className="mono">{p.sku} · {p.category}</small></div><Chip kind={p.status} /></div>
          <StockMeter stock={p.stock} threshold={p.lowStockThreshold} />
          <p>Alert level: <b>{p.lowStockThreshold}</b> units</p>
          <button className="btn btn-primary btn-sm" onClick={() => onRestock(p)}><ArrowDownToLine size={15} /> Restock</button>
        </div>
      ))}
    </div>
  )
}

function StockModal({ type, product, onClose, onDone }) {
  const toast = useToast()
  const [mode, setMode] = useState(type)
  const [productId, setProductId] = useState(product?._id || '')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState(REASONS[type][0][0])
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const { data } = useApi(() => api.get('/products', { params: { limit: 100 } }), [])
  const products = data?.data || []
  const selected = products.find((p) => p._id === productId) || product

  const switchMode = (m) => { setMode(m); setReason(REASONS[m][0][0]) }

  const submit = async (e) => {
    e.preventDefault()
    const er = {}
    if (!productId) er.productId = 'Choose a product'
    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) er.quantity = 'Enter a whole number of 1 or more'
    if (mode === 'out' && selected && Number(quantity) > selected.stock) er.quantity = `Only ${selected.stock} in stock`
    setErrors(er)
    if (Object.keys(er).length) return
    setSaving(true)
    try {
      const { data: res } = await api.post(`/inventory/stock-${mode}`, { productId, quantity: Number(quantity), reason, note })
      toast.success(`${res.product.name}: stock is now ${res.product.stock}`)
      onDone()
    } catch (err) { toast.error(errMsg(err)); setSaving(false) }
  }

  return (
    <Modal icon={mode === 'in' ? ArrowDownToLine : ArrowUpFromLine} title={mode === 'in' ? 'Stock in' : 'Stock out'} subtitle={mode === 'in' ? 'Receive new units into the warehouse.' : 'Remove units (damage, correction…).'} onClose={saving ? () => {} : onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button><button form="stock-form" className={`btn ${mode === 'in' ? 'btn-primary' : 'btn-danger'}`} disabled={saving}>{saving ? 'Saving…' : mode === 'in' ? 'Add stock' : 'Remove stock'}</button></>}>
      <form id="stock-form" onSubmit={submit} className="stack" noValidate>
        <div className="seg-toggle">
          <button type="button" className={mode === 'in' ? 'on' : ''} onClick={() => switchMode('in')}>▲ Stock in</button>
          <button type="button" className={mode === 'out' ? 'on' : ''} onClick={() => switchMode('out')}>▼ Stock out</button>
        </div>
        <Field label="Product" required error={errors.productId}>
          {(id) => (
            <select id={id} value={productId} onChange={(e) => { setProductId(e.target.value); setErrors({ ...errors, productId: '' }) }}>
              <option value="">Select a product…</option>
              {products.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.sku}) · {p.stock} in stock</option>)}
            </select>
          )}
        </Field>
        {selected && <div className="stock-now"><span>Current stock</span><StockMeter stock={selected.stock} threshold={selected.lowStockThreshold} /></div>}
        <div className="form-grid">
          <Field label="Quantity" required error={errors.quantity}>{(id) => <input id={id} type="number" min="1" step="1" inputMode="numeric" value={quantity} onChange={(e) => { setQuantity(e.target.value); setErrors({ ...errors, quantity: '' }) }} placeholder="0" autoFocus />}</Field>
          <Field label="Reason">{(id) => <select id={id} value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS[mode].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}</Field>
        </div>
        <Field label="Note">{(id) => <input id={id} maxLength="300" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional, e.g. supplier invoice #" />}</Field>
      </form>
    </Modal>
  )
}
