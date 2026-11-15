import { useState } from 'react'
import { Download, Boxes, CircleDollarSign, Percent, ReceiptText, ShoppingBag, TriangleAlert } from 'lucide-react'
import api, { errMsg } from '../api'
import { useToast } from '../context/ToastContext'
import { useApi } from '../utils/hooks'
import { downloadBlob, inr, num } from '../utils/format'
import { PageHeader, StatCard, Skeleton, ErrorState, Chip, EmptyState, StockMeter } from '../components/ui'
import { Donut, RevenueChart } from '../components/charts'

const iso = (d) => d.toISOString().slice(0, 10)
const daysAgo = (n) => iso(new Date(Date.now() - n * 86400000))

export default function Reports() {
  const toast = useToast()
  const [tab, setTab] = useState('sales')
  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(daysAgo(0))
  const [busy, setBusy] = useState(false)

  const sales = useApi(() => api.get('/reports/sales', { params: { from, to } }), [from, to])
  const inv = useApi(() => api.get('/reports/inventory'), [])

  const exportCsv = async () => {
    setBusy(true)
    try {
      const url = tab === 'sales' ? '/reports/sales' : '/reports/inventory'
      const { data } = await api.get(url, { params: { format: 'csv', from, to }, responseType: 'blob' })
      downloadBlob(data, `${tab}-report-${daysAgo(0)}.csv`)
    } catch (err) { toast.error(errMsg(err)) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader eyebrow="INSIGHTS" title="Reports" subtitle="Sales performance and the value of your stock.">
        <button className="btn btn-ghost" onClick={exportCsv} disabled={busy}><Download size={16} /> {busy ? 'Preparing…' : 'Export CSV'}</button>
      </PageHeader>

      <div className="toolbar">
        <div className="tabs inline" role="tablist">
          <button role="tab" aria-selected={tab === 'sales'} className={tab === 'sales' ? 'on' : ''} onClick={() => setTab('sales')}>Sales</button>
          <button role="tab" aria-selected={tab === 'inventory'} className={tab === 'inventory' ? 'on' : ''} onClick={() => setTab('inventory')}>Inventory</button>
        </div>
        {tab === 'sales' && (
          <>
            <label className="date-pair"><span>From</span><input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
            <label className="date-pair"><span>To</span><input type="date" value={to} min={from} max={daysAgo(0)} onChange={(e) => setTo(e.target.value)} /></label>
            <div className="quick-ranges">{[[7, '7D'], [30, '30D'], [90, '90D']].map(([n, l]) => <button key={l} onClick={() => { setFrom(daysAgo(n - 1)); setTo(daysAgo(0)) }}>{l}</button>)}</div>
          </>
        )}
      </div>

      {tab === 'sales' ? <SalesTab {...sales} /> : <InventoryTab {...inv} />}
    </>
  )
}

function SalesTab({ data, loading, error, reload }) {
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (loading && !data) return <Skeleton rows={6} />
  const s = data.summary
  return (
    <>
      <section className="stats">
        <StatCard big tone="amber" label="REVENUE" icon={CircleDollarSign} value={inr(s.revenue, true)} foot={<>from <b>{s.orders}</b> orders</>} />
        <StatCard label="ORDERS" icon={ReceiptText} value={num(s.orders)} foot={<>{data.byStatus.completed || 0} completed · {data.byStatus.cancelled || 0} cancelled</>} />
        <StatCard label="UNITS SOLD" icon={ShoppingBag} value={num(s.itemsSold)} foot="across all products" />
        <StatCard label="AVG ORDER VALUE" icon={Percent} value={inr(s.averageOrderValue, true)} foot={<>{inr(s.discount)} in discounts</>} />
      </section>
      {s.orders === 0 ? <div className="panel"><EmptyState icon={ReceiptText} title="No sales in this period" text="Pick a wider date range." /></div> : (
        <>
          <section className="panel"><div className="panel-head"><div><h2>Revenue over time</h2><p>Daily revenue, cancelled orders excluded</p></div></div><RevenueChart data={data.byDay} wide height={270} /></section>
          <section className="grid-2">
            <div className="panel flush">
              <div className="panel-head pad"><div><h2>Top products</h2><p>By revenue</p></div></div>
              <div className="table-wrap"><table className="rtable"><thead><tr><th>Product</th><th className="num">Units</th><th className="num">Revenue</th></tr></thead>
                <tbody>{data.topProducts.map((p) => <tr key={p.productId}><td data-label="Product"><b>{p.name}</b><small className="mono">{p.sku}</small></td><td data-label="Units" className="num mono">{num(p.quantity)}</td><td data-label="Revenue" className="num mono">{inr(p.revenue)}</td></tr>)}</tbody></table></div>
            </div>
            <div className="panel"><div className="panel-head"><div><h2>Revenue by category</h2><p>Share of sales</p></div></div>
              <Donut items={data.byCategory.map((c) => ({ category: c.category, value: c.revenue }))} /></div>
          </section>
        </>
      )}
    </>
  )
}

function InventoryTab({ data, loading, error, reload }) {
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (loading && !data) return <Skeleton rows={6} />
  const s = data.summary
  return (
    <>
      <section className="stats">
        <StatCard big tone="amber" label="STOCK VALUE" icon={CircleDollarSign} value={inr(s.value, true)} foot="at selling price" />
        <StatCard label="PRODUCTS" icon={Boxes} value={num(s.products)} foot={<>{num(s.units)} units in stock</>} />
        <StatCard tone={s.lowStock ? 'danger' : 'default'} label="LOW STOCK" icon={TriangleAlert} value={num(s.lowStock)} foot="at or below alert level" />
        <StatCard tone={s.outOfStock ? 'danger' : 'default'} label="OUT OF STOCK" icon={TriangleAlert} value={num(s.outOfStock)} foot="needs restocking" />
      </section>
      <section className="grid-2">
        <div className="panel"><div className="panel-head"><div><h2>Stock value by category</h2><p>Where your money is sitting</p></div></div>
          <Donut items={data.byCategory.map((c) => ({ category: c.category, value: c.value }))} /></div>
        <div className="panel flush">
          <div className="panel-head pad"><div><h2>Needs attention</h2><p>Low or out of stock</p></div></div>
          {data.attention.length === 0 ? <EmptyState icon={Boxes} title="All stocked up" /> : (
            <div className="table-wrap"><table className="rtable"><thead><tr><th>Product</th><th>Stock</th><th>Status</th></tr></thead>
              <tbody>{data.attention.map((p) => <tr key={p._id}><td data-label="Product"><b>{p.name}</b><small className="mono">{p.sku}</small></td><td data-label="Stock"><StockMeter stock={p.stock} threshold={p.lowStockThreshold} /></td><td data-label="Status"><Chip kind={p.status} /></td></tr>)}</tbody></table></div>
          )}
        </div>
      </section>
    </>
  )
}
