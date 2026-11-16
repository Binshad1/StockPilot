import { useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Package, Search, X, TriangleAlert } from 'lucide-react'
import { imgUrl } from '../api'
import { useModalBehavior } from '../utils/hooks'

export function PageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="eyebrow"><i /> {eyebrow}</div>}
        <h1>{title}<span>.</span></h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <label className="search">
      <Search size={16} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      {value && <button type="button" aria-label="Clear search" onClick={() => onChange('')}><X size={14} /></button>}
    </label>
  )
}

export function Field({ label, hint, error, children, required }) {
  const id = useId()
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}{required && <b> *</b>}</label>
      {typeof children === 'function' ? children(id) : children}
      {error ? <small className="field-error">{error}</small> : hint ? <small>{hint}</small> : null}
    </div>
  )
}

export function Spinner({ label }) {
  return <div className="spinner-wrap"><div className="spinner" />{label && <span>{label}</span>}</div>
}

export function Skeleton({ rows = 5 }) {
  return (
    <div className="skeleton-list" aria-hidden>
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton" style={{ opacity: 1 - i * 0.12 }} />)}
    </div>
  )
}

export function EmptyState({ icon: Icon = Package, title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon size={26} /></div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="empty">
      <div className="empty-icon danger"><TriangleAlert size={26} /></div>
      <h3>Couldn’t load this</h3>
      <p>{message}</p>
      {onRetry && <button className="btn btn-ghost" onClick={onRetry}>Try again</button>}
    </div>
  )
}

const STATUS = {
  ok: ['good', 'In stock'], low: ['warn', 'Low stock'], out: ['bad', 'Out of stock'],
  pending: ['warn', 'Pending'], completed: ['good', 'Completed'], cancelled: ['bad', 'Cancelled'],
  admin: ['amber', 'Admin'], staff: ['neutral', 'Staff'], active: ['good', 'Active'], disabled: ['bad', 'Disabled'],
}
export function Chip({ kind }) {
  const [tone, label] = STATUS[kind] || ['neutral', kind]
  return <span className={`chip chip-${tone}`}><i />{label}</span>
}

// 10-segment stock meter: unique replacement for a plain progress bar
export function StockMeter({ stock, threshold }) {
  const max = Math.max(threshold * 3, stock, 1)
  const filled = Math.min(10, Math.ceil((stock / max) * 10))
  const tone = stock <= 0 ? 'bad' : stock <= threshold ? 'warn' : 'good'
  return (
    <div className="meter" title={`${stock} in stock · alert at ${threshold}`}>
      <b>{stock}</b>
      <div className={`segs ${tone}`}>{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < filled ? 'on' : ''} />)}</div>
    </div>
  )
}

export function Thumb({ src, name, size = 44 }) {
  const [bad, setBad] = useState(false)
  if (!src || bad) {
    return <div className="thumb thumb-empty" style={{ width: size, height: size }}>{(name || '?').trim().charAt(0).toUpperCase()}</div>
  }
  return <img className="thumb" style={{ width: size, height: size }} src={imgUrl(src)} alt={name} onError={() => setBad(true)} loading="lazy" />
}

export function Pagination({ page, pages, total, limit, onChange }) {
  if (total === 0) return null
  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)
  return (
    <div className="pagination">
      <span>Showing <b>{from}–{to}</b> of <b>{total}</b></span>
      <div>
        <button className="icon-btn" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
        <span className="page-num">{page} / {pages}</span>
        <button className="icon-btn" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
      </div>
    </div>
  )
}

export function Modal({ title, subtitle, icon: Icon, onClose, children, footer, wide, drawer }) {
  useModalBehavior(onClose)
  // Rendered into <body> (a portal) so "position: fixed" is always relative to the screen,
  // never to an animated page container.
  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''} ${drawer ? 'modal-drawer' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          {Icon && <div className="modal-icon"><Icon size={20} /></div>}
          <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, busy, onConfirm, onClose }) {
  return (
    <Modal
      title={title} icon={TriangleAlert} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
      </>}
    >
      <p className="confirm-text">{message}</p>
    </Modal>
  )
}

export function StatCard({ label, value, icon: Icon, foot, tone = 'default', big }) {
  return (
    <div className={`stat stat-${tone} ${big ? 'stat-big' : ''}`}>
      <span className="br tl" /><span className="br tr" /><span className="br bl" /><span className="br bb" />
      <div className="stat-head"><span>{label}</span>{Icon && <Icon size={17} />}</div>
      <div className="stat-value">{value}</div>
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  )
}
