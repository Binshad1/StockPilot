import { Link } from 'react-router-dom'
import {
  AlertTriangle, ArrowUpRight, CircleDollarSign, Package, ShoppingCart, TrendingUp,
  PackagePlus, PackageMinus, ReceiptText, Layers,
} from 'lucide-react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../utils/hooks'
import { greeting, inr, num, timeAgo } from '../utils/format'
import { PageHeader, StatCard, Skeleton, ErrorState, Chip, StockMeter, EmptyState } from '../components/ui'
import { MovementChart, RevenueChart } from '../components/charts'

const ACT_ICON = { order: ReceiptText, 'stock-in': PackagePlus, 'stock-out': PackageMinus }

export default function Dashboard() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useApi(() => api.get('/dashboard'), [])
  const first = (user?.name || '').split(' ')[0]
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long' }).toUpperCase()

  if (error) return <ErrorState message={error} onRetry={reload} />

  const t = data?.totals
  const weekRevenue = data?.sales.reduce((s, d) => s + d.revenue, 0) || 0
  const maxTop = Math.max(...(data?.topProducts.map((p) => p.quantity) || [1]), 1)

  return (
    <>
      <PageHeader eyebrow={`${today} · OPERATIONS OVERVIEW`} title={`${greeting()}, ${first}`} subtitle="Here’s what’s happening across your inventory today." />

      {loading && !data ? (
        <><div className="stats">{[0, 1, 2, 3].map((i) => <div key={i} className="stat skeleton" style={{ height: 128 }} />)}</div><Skeleton rows={4} /></>
      ) : (
        <>
          {t.lowStock > 0 && (
            <Link to="/inventory?tab=alerts" className="alert-banner">
              <AlertTriangle size={18} />
              <span><b>{t.lowStock} product{t.lowStock > 1 ? 's' : ''}</b> {t.lowStock > 1 ? 'are' : 'is'} running low{t.outOfStock > 0 ? ` · ${t.outOfStock} out of stock` : ''}</span>
              <em>Review &amp; restock <ArrowUpRight size={15} /></em>
            </Link>
          )}

          <section className="stats">
            <StatCard big tone="amber" label="INVENTORY VALUE" icon={CircleDollarSign} value={inr(t.inventoryValue, true)}
              foot={<><b>{num(t.stockUnits)}</b> units across <b>{t.products}</b> products</>} />
            <StatCard label="REVENUE TODAY" icon={TrendingUp} value={inr(t.revenueToday, true)}
              foot={<><b>{inr(t.revenueMonth, true)}</b> this month</>} />
            <StatCard label="ORDERS" icon={ShoppingCart} value={num(t.orders)}
              foot={<><b className="warn-text">{t.pendingOrders}</b> pending · <b>{t.completedOrders}</b> done</>} />
            <StatCard tone={t.lowStock ? 'danger' : 'default'} label="STOCK ALERTS" icon={AlertTriangle} value={<>{String(t.lowStock).padStart(2, '0')}<small> items</small></>}
              foot={t.lowStock ? <span className="warn-text">Needs attention</span> : 'All stock levels healthy'} />
          </section>

          <section className="grid-2">
            <div className="panel">
              <div className="panel-head"><div><h2>Sales · last 7 days</h2><p>{inr(weekRevenue)} from non-cancelled orders</p></div></div>
              <RevenueChart data={data.sales} />
            </div>
            <div className="panel">
              <div className="panel-head">
                <div><h2>Stock movement</h2><p>Units in vs out</p></div>
                <div className="legend"><span><i className="lg-in" />In</span><span><i className="lg-out" />Out</span></div>
              </div>
              <MovementChart data={data.movement} />
            </div>
          </section>

          <section className="grid-3">
            <div className="panel">
              <div className="panel-head"><div><h2>Top sellers</h2><p>Units sold · last 30 days</p></div></div>
              {data.topProducts.length === 0 ? <EmptyState icon={Layers} title="No sales yet" text="Create an order to see your best sellers." /> : (
                <ol className="rank">
                  {data.topProducts.map((p, i) => (
                    <li key={p._id}>
                      <span className="rank-n">{i + 1}</span>
                      <div className="rank-body">
                        <div><b>{p.name}</b><em>{num(p.quantity)} units</em></div>
                        <div className="rank-bar"><i style={{ width: `${(p.quantity / maxTop) * 100}%` }} /></div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="panel">
              <div className="panel-head">
                <div><h2>Low stock watchlist</h2><p>At or below alert level</p></div>
                <Link className="text-btn" to="/inventory?tab=alerts">View all <ArrowUpRight size={14} /></Link>
              </div>
              {data.lowStockItems.length === 0 ? <EmptyState icon={Package} title="All good" text="Nothing is running low right now." /> : (
                <ul className="watch">
                  {data.lowStockItems.map((p) => (
                    <li key={p._id}>
                      <div><b>{p.name}</b><small>{p.sku}</small></div>
                      <StockMeter stock={p.stock} threshold={p.lowStockThreshold} />
                      <Chip kind={p.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="panel">
              <div className="panel-head"><div><h2>Live activity</h2><p>Recent warehouse events</p></div></div>
              {data.activity.length === 0 ? <EmptyState icon={ReceiptText} title="Nothing yet" /> : (
                <ul className="activity">
                  {data.activity.map((a, i) => {
                    const I = ACT_ICON[a.type] || ReceiptText
                    return (
                      <li key={i}>
                        <div className={`act-icon ${a.type}`}><I size={16} /></div>
                        <div><b>{a.title}</b><small>{a.detail}</small></div>
                        <time>{timeAgo(a.at)}</time>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </>
  )
}
