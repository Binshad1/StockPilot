import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Minus, Plus, ShoppingBag, Trash2, ArrowLeft, PackageSearch } from 'lucide-react'
import api, { errMsg } from '../api'
import { useToast } from '../context/ToastContext'
import { useApi, useDebounce } from '../utils/hooks'
import { inr } from '../utils/format'
import { PageHeader, SearchInput, Thumb, Chip, EmptyState, Skeleton, Field } from '../components/ui'

export default function NewOrder() {
  const nav = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([]) // [{ product, quantity }]
  const [customerId, setCustomerId] = useState(params.get('customer') || '')
  const [discount, setDiscount] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const q = useDebounce(search, 300)

  const { data: prods, loading } = useApi(() => api.get('/products', { params: { q, limit: 24 } }), [q])
  const { data: custs } = useApi(() => api.get('/customers', { params: { limit: 100 } }), [])

  const inCart = (id) => cart.find((l) => l.product._id === id)
  const add = (p) => {
    if (p.stock <= 0) return
    setCart((c) => {
      const line = c.find((l) => l.product._id === p._id)
      if (!line) return [...c, { product: p, quantity: 1 }]
      return c.map((l) => (l.product._id === p._id ? { ...l, quantity: Math.min(l.quantity + 1, p.stock) } : l))
    })
  }
  const setQty = (id, qty) =>
    setCart((c) => c.map((l) => (l.product._id === id ? { ...l, quantity: Math.max(1, Math.min(Number(qty) || 1, l.product.stock)) } : l)))
  const remove = (id) => setCart((c) => c.filter((l) => l.product._id !== id))

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.product.price * l.quantity, 0), [cart])
  const disc = Math.min(Math.max(Number(discount) || 0, 0), subtotal)
  const total = subtotal - disc
  const units = cart.reduce((s, l) => s + l.quantity, 0)

  const place = async () => {
    if (cart.length === 0) return toast.error('Add at least one product')
    setSaving(true)
    try {
      const { data } = await api.post('/orders', {
        customerId: customerId || undefined, discount: disc, notes,
        items: cart.map((l) => ({ productId: l.product._id, quantity: l.quantity })),
      })
      toast.success(`${data.orderNumber} created · stock updated`)
      nav('/orders')
    } catch (err) { toast.error(errMsg(err, 'Could not create the order')); setSaving(false) }
  }

  return (
    <>
      <PageHeader eyebrow="SALES" title="New order" subtitle="Pick products, choose a customer and place the order.">
        <Link to="/orders" className="btn btn-ghost"><ArrowLeft size={16} /> Back to orders</Link>
      </PageHeader>

      <div className="order-builder">
        <section className="picker">
          <SearchInput value={search} onChange={setSearch} placeholder="Search products to add…" />
          {loading && !prods ? <Skeleton rows={5} /> : prods.data.length === 0 ? (
            <div className="panel"><EmptyState icon={PackageSearch} title="No products found" text="Try another search." /></div>
          ) : (
            <div className="pick-grid">
              {prods.data.map((p) => {
                const line = inCart(p._id)
                const out = p.stock <= 0
                return (
                  <button key={p._id} className={`pick-card ${line ? 'selected' : ''}`} disabled={out || (line && line.quantity >= p.stock)} onClick={() => add(p)}>
                    <Thumb src={p.image} name={p.name} size={52} />
                    <div className="pick-info"><b>{p.name}</b><small className="mono">{p.sku}</small></div>
                    <div className="pick-meta"><span className="mono price">{inr(p.price)}</span>{out ? <Chip kind="out" /> : <small>{p.stock} left</small>}</div>
                    <span className="pick-add">{line ? <b>{line.quantity}</b> : <Plus size={16} />}</span>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <aside className="cart panel">
          <div className="panel-head"><div><h2>Order summary</h2><p>{units} unit{units === 1 ? '' : 's'} · {cart.length} product{cart.length === 1 ? '' : 's'}</p></div></div>

          <Field label="Customer" hint={<>Leave empty for a walk-in sale · <Link to="/customers">add a customer</Link></>}>
            {(id) => (
              <select id={id} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Walk-in customer</option>
                {(custs?.data || []).map((c) => <option key={c._id} value={c._id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>)}
              </select>
            )}
          </Field>

          {cart.length === 0 ? (
            <div className="cart-empty"><ShoppingBag size={28} /><p>Your cart is empty.<br />Tap a product to add it.</p></div>
          ) : (
            <ul className="cart-lines">
              {cart.map((l) => (
                <li key={l.product._id}>
                  <div className="cl-top"><b>{l.product.name}</b><button className="icon-btn danger" onClick={() => remove(l.product._id)} aria-label={`Remove ${l.product.name}`}><Trash2 size={15} /></button></div>
                  <div className="cl-bottom">
                    <div className="stepper">
                      <button onClick={() => setQty(l.product._id, l.quantity - 1)} disabled={l.quantity <= 1} aria-label="Decrease"><Minus size={14} /></button>
                      <input type="number" inputMode="numeric" min="1" max={l.product.stock} value={l.quantity} onChange={(e) => setQty(l.product._id, e.target.value)} aria-label="Quantity" />
                      <button onClick={() => setQty(l.product._id, l.quantity + 1)} disabled={l.quantity >= l.product.stock} aria-label="Increase"><Plus size={14} /></button>
                    </div>
                    <span className="mono">{inr(l.product.price * l.quantity)}</span>
                  </div>
                  {l.quantity >= l.product.stock && <small className="warn-text">Max available: {l.product.stock}</small>}
                </li>
              ))}
            </ul>
          )}

          <div className="form-grid compact">
            <Field label="Discount (₹)">{(id) => <input id={id} type="number" min="0" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />}</Field>
            <Field label="Note">{(id) => <input id={id} maxLength="500" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />}</Field>
          </div>

          <div className="totals">
            <div><span>Subtotal</span><b className="mono">{inr(subtotal)}</b></div>
            {disc > 0 && <div><span>Discount</span><b className="mono">− {inr(disc)}</b></div>}
            <div className="grand"><span>Total</span><b className="mono">{inr(total)}</b></div>
          </div>
          <button className="btn btn-primary btn-lg" disabled={saving || cart.length === 0} onClick={place}>{saving ? 'Placing order…' : `Place order · ${inr(total)}`}</button>
        </aside>
      </div>
    </>
  )
}
