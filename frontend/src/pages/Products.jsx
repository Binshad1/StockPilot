import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Pencil, Plus, Trash2, Upload, PackageSearch } from 'lucide-react'
import api, { errMsg } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useApi, useDebounce, usePage } from '../utils/hooks'
import { inr } from '../utils/format'
import { PageHeader, SearchInput, Chip, StockMeter, Thumb, Pagination, Modal, ConfirmDialog, Field, EmptyState, ErrorState, Skeleton } from '../components/ui'

const LIMIT = 8
const EMPTY = { name: '', sku: '', category: '', price: '', stock: '', lowStockThreshold: 10, description: '' }

export default function Products() {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | product
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const q = useDebounce(search)
  const [page, setPage] = usePage(`${q}|${category}|${status}`)

  const { data, loading, error, reload } = useApi(
    () => api.get('/products', { params: { q, category, status, page, limit: LIMIT } }), [q, category, status, page])
  const { data: categories, reload: reloadCats } = useApi(() => api.get('/products/categories'), [])

  const remove = async () => {
    setBusy(true)
    try {
      await api.delete(`/products/${deleting._id}`)
      toast.success(`${deleting.name} deleted`)
      setDeleting(null)
      if (data.data.length === 1 && page > 1) setPage(page - 1); else reload()
      reloadCats()
    } catch (err) { toast.error(errMsg(err)) } finally { setBusy(false) }
  }

  const rows = data?.data || []
  const filtered = q || category || status

  return (
    <>
      <PageHeader eyebrow="CATALOGUE" title="Products" subtitle={isAdmin ? 'Add, edit and organise everything you sell.' : 'Browse the product catalogue and stock levels.'}>
        {isAdmin && <button className="btn btn-primary" onClick={() => setEditing('new')}><Plus size={17} /> Add product</button>}
      </PageHeader>

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, SKU or category…" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {(categories || []).map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by stock status">
          <option value="">Any stock level</option>
          <option value="ok">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
      </div>

      <div className="panel flush">
        {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <Skeleton rows={6} /> : rows.length === 0 ? (
          <EmptyState icon={PackageSearch} title={filtered ? 'No products match' : 'No products yet'}
            text={filtered ? 'Try a different search or clear the filters.' : isAdmin ? 'Add your first product to get started.' : 'An admin needs to add products first.'}
            action={!filtered && isAdmin && <button className="btn btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Add product</button>} />
        ) : (
          <div className={`table-wrap ${loading ? 'is-loading' : ''}`}>
            <table className="rtable">
              <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th className="num">Price</th><th>Stock</th><th>Status</th>{isAdmin && <th className="actions-col" />}</tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p._id}>
                    <td data-label="Product"><div className="cell-product"><Thumb src={p.image} name={p.name} /><div><b>{p.name}</b>{p.description && <small>{p.description}</small>}</div></div></td>
                    <td data-label="SKU" className="mono">{p.sku}</td>
                    <td data-label="Category">{p.category}</td>
                    <td data-label="Price" className="num mono">{inr(p.price)}</td>
                    <td data-label="Stock"><StockMeter stock={p.stock} threshold={p.lowStockThreshold} /></td>
                    <td data-label="Status"><Chip kind={p.status} /></td>
                    {isAdmin && (
                      <td className="actions-col">
                        <button className="icon-btn" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}><Pencil size={16} /></button>
                        <button className="icon-btn danger" onClick={() => setDeleting(p)} aria-label={`Delete ${p.name}`}><Trash2 size={16} /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} pages={data.pages} total={data.total} limit={LIMIT} onChange={setPage} />}
      </div>

      {editing && (
        <ProductModal product={editing === 'new' ? null : editing} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); reloadCats() }} />
      )}
      {deleting && (
        <ConfirmDialog danger busy={busy} title="Delete product?" confirmLabel="Delete" onClose={() => setDeleting(null)} onConfirm={remove}
          message={<>“{deleting.name}” will be removed from your catalogue. Past orders keep their own copy of the product details.</>} />
      )}
      {!isAdmin && <p className="hint-line">Only admins can add or edit products. Need stock changed? Use <Link to="/inventory">Inventory</Link>.</p>}
    </>
  )
}

function ProductModal({ product, onClose, onSaved }) {
  const toast = useToast()
  const isEdit = !!product
  const [form, setForm] = useState(isEdit ? { ...product } : EMPTY)
  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file])
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setErrors({ ...errors, [k]: '' }) }

  const pick = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { toast.error('Image must be smaller than 5 MB'); e.target.value = ''; return }
    setFile(f)
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.sku.trim()) e.sku = 'SKU is required'
    if (!form.category.trim()) e.category = 'Category is required'
    if (form.price === '' || Number(form.price) < 0) e.price = 'Enter a valid price'
    if (!isEdit && (form.stock === '' || Number(form.stock) < 0 || !Number.isInteger(Number(form.stock)))) e.stock = 'Enter a whole number'
    if (Number(form.lowStockThreshold) < 0) e.lowStockThreshold = 'Cannot be negative'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const fd = new FormData()
      ;['name', 'sku', 'category', 'price', 'lowStockThreshold', 'description'].forEach((k) => fd.append(k, String(form[k] ?? '').trim()))
      if (!isEdit) fd.append('stock', form.stock)
      if (file) fd.append('image', file)
      if (isEdit) await api.put(`/products/${product._id}`, fd)
      else await api.post('/products', fd)
      toast.success(isEdit ? 'Product updated' : 'Product created')
      onSaved()
    } catch (err) { toast.error(errMsg(err, 'Failed to save product')); setSaving(false) }
  }

  return (
    <Modal wide icon={Package} title={isEdit ? 'Edit product' : 'Add new product'} subtitle={isEdit ? 'Update the product details.' : 'Add a new item to your inventory.'}
      onClose={saving ? () => {} : onClose}
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button form="product-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}</button>
      </>}>
      <form id="product-form" className="product-form" onSubmit={submit} noValidate>
        <label className="upload">
          {preview ? <img src={preview} alt="Preview" /> : product?.image ? <Thumb src={product.image} name={product.name} size={160} /> : (
            <><div className="upload-icon"><Upload size={26} /></div><strong>Upload image</strong><span>PNG, JPG, WEBP or GIF · max 5 MB</span></>
          )}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={pick} />
          {(preview || product?.image) && <span className="upload-change">Click to change</span>}
        </label>

        <div className="form-grid">
          <Field label="Product name" required error={errors.name}>{(id) => <input id={id} value={form.name} onChange={set('name')} placeholder="e.g. Wireless Mouse" autoFocus />}</Field>
          <Field label="SKU" required error={errors.sku} hint="Unique code, saved in capitals">{(id) => <input id={id} value={form.sku} onChange={set('sku')} placeholder="e.g. WM-001" />}</Field>
          <Field label="Category" required error={errors.category}>{(id) => <input id={id} value={form.category} onChange={set('category')} placeholder="e.g. Electronics" />}</Field>
          <Field label="Unit price (₹)" required error={errors.price}>{(id) => <input id={id} type="number" min="0" step="0.01" inputMode="decimal" value={form.price} onChange={set('price')} placeholder="0.00" />}</Field>
          {isEdit ? (
            <Field label="Current stock" hint="Change stock from the Inventory page so it’s logged">{(id) => <input id={id} value={product.stock} disabled />}</Field>
          ) : (
            <Field label="Opening stock" required error={errors.stock}>{(id) => <input id={id} type="number" min="0" step="1" inputMode="numeric" value={form.stock} onChange={set('stock')} placeholder="0" />}</Field>
          )}
          <Field label="Low-stock alert at" error={errors.lowStockThreshold} hint="Alert when stock falls to this number">{(id) => <input id={id} type="number" min="0" step="1" inputMode="numeric" value={form.lowStockThreshold} onChange={set('lowStockThreshold')} />}</Field>
          <div className="span-2"><Field label="Description">{(id) => <textarea id={id} rows="2" maxLength="500" value={form.description || ''} onChange={set('description')} placeholder="Short description (optional)" />}</Field></div>
        </div>
      </form>
    </Modal>
  )
}
