import { useState } from 'react'
import { inr, num, shortDay, dayMonth } from '../utils/format'

// Axis top value: 4 equal steps of a round number (1, 2, 2.5, 5 or 10 x 10^n)
const nice = (max) => {
  if (max <= 0) return 4
  const raw = max / 4
  const p = Math.pow(10, Math.floor(Math.log10(raw)))
  const n = raw / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p * 4
}
const axisMoney = (v) => (v >= 10000000 ? `${+(v / 10000000).toFixed(1)}Cr` : v >= 100000 ? `${+(v / 100000).toFixed(1)}L` : v >= 1000 ? `${+(v / 1000).toFixed(1)}K` : String(Math.round(v)))

/* Grouped bars: stock-in vs stock-out */
export function MovementChart({ data }) {
  const [hover, setHover] = useState(null)
  const W = 640, H = 240, L = 40, R = 10, T = 14, B = 30
  const top = nice(Math.max(...data.flatMap((d) => [d.in, d.out]), 5))
  const iw = W - L - R, ih = H - T - B
  const slot = iw / data.length
  const bw = Math.min(22, slot / 3)
  const y = (v) => T + ih - (v / top) * ih

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Stock in versus stock out for the last 7 days">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(top * t)} y2={y(top * t)} className="grid" />
          <text x={L - 8} y={y(top * t) + 4} textAnchor="end" className="axis">{num(Math.round(top * t))}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const cx = L + slot * i + slot / 2
        return (
          <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onTouchStart={() => setHover(i)}>
            <rect x={cx - slot / 2} y={T} width={slot} height={ih} fill="transparent" />
            {hover === i && <rect x={cx - slot / 2 + 4} y={T} width={slot - 8} height={ih} className="hover-band" />}
            <rect x={cx - bw - 2} y={y(d.in)} width={bw} height={Math.max(ih - (y(d.in) - T), 0)} rx="3" className="bar-in" />
            <rect x={cx + 2} y={y(d.out)} width={bw} height={Math.max(ih - (y(d.out) - T), 0)} rx="3" className="bar-out" />
            <text x={cx} y={H - 9} textAnchor="middle" className={`axis ${hover === i ? 'active' : ''}`}>{shortDay(d.date)}</text>
          </g>
        )
      })}
      {hover !== null && (() => {
        const d = data[hover]
        const cx = L + slot * hover + slot / 2
        const bx = Math.min(Math.max(cx - 62, L), W - R - 124)
        return (
          <g className="tip" pointerEvents="none">
            <rect x={bx} y={T - 4} width="124" height="52" rx="7" />
            <text x={bx + 10} y={T + 12} className="tip-title">{dayMonth(d.date)}</text>
            <text x={bx + 10} y={T + 28} className="tip-in">▲ In  {num(d.in)}</text>
            <text x={bx + 10} y={T + 42} className="tip-out">▼ Out {num(d.out)}</text>
          </g>
        )
      })()}
    </svg>
  )
}

/* Smooth area line: revenue */
export function RevenueChart({ data, height = 240, xKey = 'date', wide = false }) {
  const [hover, setHover] = useState(null)
  const W = wide ? 1000 : 640, H = height, L = 52, R = 14, T = 16, B = 30
  const top = nice(Math.max(...data.map((d) => d.revenue), 100))
  const iw = W - L - R, ih = H - T - B
  const x = (i) => L + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw)
  const y = (v) => T + ih - (v / top) * ih
  const pts = data.map((d, i) => [x(i), y(d.revenue)])
  const line = pts.reduce((p, [px, py], i) => {
    if (i === 0) return `M${px},${py}`
    const [qx, qy] = pts[i - 1]
    const cx = (qx + px) / 2
    return `${p} C${cx},${qy} ${cx},${py} ${px},${py}`
  }, '')
  const area = pts.length ? `${line} L${pts[pts.length - 1][0]},${T + ih} L${pts[0][0]},${T + ih} Z` : ''
  const step = Math.ceil(data.length / 8)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Revenue over time">
      <defs>
        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--amber)" stopOpacity=".38" />
          <stop offset="100%" stopColor="var(--amber)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(top * t)} y2={y(top * t)} className="grid" />
          <text x={L - 8} y={y(top * t) + 4} textAnchor="end" className="axis">{axisMoney(top * t)}</text>
        </g>
      ))}
      <path d={area} fill="url(#revGrad)" />
      <path d={line} className="rev-line" />
      {data.map((d, i) => (
        <g key={d[xKey]} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onTouchStart={() => setHover(i)}>
          <rect x={x(i) - iw / data.length / 2} y={T} width={iw / data.length} height={ih} fill="transparent" />
          <circle cx={x(i)} cy={y(d.revenue)} r={hover === i ? 5.5 : 3.2} className="rev-dot" />
          {i % step === 0 && <text x={x(i)} y={H - 9} textAnchor="middle" className="axis">{data.length <= 7 ? shortDay(d[xKey]) : dayMonth(d[xKey])}</text>}
        </g>
      ))}
      {hover !== null && (() => {
        const d = data[hover]
        const bx = Math.min(Math.max(x(hover) - 70, L), W - R - 140)
        const by = Math.max(y(d.revenue) - 62, T)
        return (
          <g className="tip" pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={T} y2={T + ih} className="cursor" />
            <rect x={bx} y={by} width="140" height="50" rx="7" />
            <text x={bx + 10} y={by + 16} className="tip-title">{dayMonth(d[xKey])}</text>
            <text x={bx + 10} y={by + 34} className="tip-in">{inr(d.revenue)} · {d.orders} order{d.orders === 1 ? '' : 's'}</text>
          </g>
        )
      })()}
    </svg>
  )
}

const DONUT = ['#f0a742', '#6ea8e6', '#7fc88a', '#c792ea', '#ef6a5b', '#5fc9c0', '#d9d36a']
export function Donut({ items, valueKey = 'value', labelKey = 'category', money = true }) {
  const total = items.reduce((s, i) => s + i[valueKey], 0) || 1
  const R = 62, C = 2 * Math.PI * R
  // start offset of each slice along the ring
  const offsets = []
  items.reduce((sum, it) => { offsets.push(sum); return sum + (it[valueKey] / total) * C }, 0)
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 160 160" className="donut" role="img" aria-label="Breakdown by category">
        <circle cx="80" cy="80" r={R} className="donut-track" />
        {items.map((it, i) => {
          const len = (it[valueKey] / total) * C
          return (
            <circle key={it[labelKey]} cx="80" cy="80" r={R} fill="none" stroke={DONUT[i % DONUT.length]} strokeWidth="20"
              strokeDasharray={`${Math.max(len - 2, 0)} ${C - Math.max(len - 2, 0)}`} strokeDashoffset={-offsets[i]} transform="rotate(-90 80 80)" />
          )
        })}
        <text x="80" y="76" textAnchor="middle" className="donut-num">{money ? inr(total, true) : num(total)}</text>
        <text x="80" y="94" textAnchor="middle" className="axis">TOTAL</text>
      </svg>
      <ul className="donut-legend">
        {items.map((it, i) => (
          <li key={it[labelKey]}>
            <i style={{ background: DONUT[i % DONUT.length] }} />
            <span>{it[labelKey]}</span>
            <b>{Math.round((it[valueKey] / total) * 100)}%</b>
          </li>
        ))}
      </ul>
    </div>
  )
}
