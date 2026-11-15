import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ArrowLeftRight, ShoppingCart, Users, ChartNoAxesCombined,
  ShieldCheck, LogOut, Menu, Bell, Plus, Boxes, X, UserCog, Ellipsis,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api'

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/inventory', label: 'Inventory', icon: ArrowLeftRight, badge: true },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/reports', label: 'Reports', icon: ChartNoAxesCombined, admin: true },
  { to: '/users', label: 'Team', icon: ShieldCheck, admin: true },
]
const TITLES = { '': 'Overview', products: 'Products', inventory: 'Inventory', orders: 'Orders', customers: 'Customers', reports: 'Reports', users: 'Team', profile: 'My account' }

export default function Layout() {
  const { user, isAdmin, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [alerts, setAlerts] = useState(0)
  const loc = useLocation()
  const nav = useNavigate()
  const section = loc.pathname.split('/')[1]

  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])
  useEffect(() => {
    api.get('/inventory/low-stock').then((r) => setAlerts(r.data.length)).catch(() => {})
  }, [loc.pathname])

  const items = NAV.filter((n) => !n.admin || isAdmin)
  const initials = (user?.name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="shell">
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`} onClick={(e) => e.target.closest('a') && setOpen(false)}>
        <div className="brand">
          <div className="brand-mark"><Boxes size={22} /></div>
          <div><strong>stock<span>pilot</span></strong><small>INVENTORY · ORDERS</small></div>
          <button className="icon-btn close-nav" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav>
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <n.icon size={18} /><span>{n.label}</span>
              {n.badge && alerts > 0 && <em className="nav-count">{alerts}</em>}
            </NavLink>
          ))}
        </nav>

        <div className="nav-label">ACCOUNT</div>
        <nav>
          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><UserCog size={18} /><span>My account</span></NavLink>
        </nav>

        <div className="sidebar-foot">
          <div className="hazard" />
          <div className="user-card">
            <div className="avatar">{initials}</div>
            <div className="user-meta"><b>{user?.name}</b><small>{isAdmin ? 'Administrator' : 'Staff member'}</small></div>
            <button className="icon-btn" onClick={logout} title="Sign out" aria-label="Sign out"><LogOut size={17} /></button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="crumbs"><span>Workspace</span><i>/</i><b>{TITLES[section] ?? 'StockPilot'}</b></div>
          <div className="top-actions">
            <span className="live"><i /> Live</span>
            <button className="icon-btn bell" onClick={() => nav('/inventory?tab=alerts')} aria-label={`${alerts} stock alerts`}>
              <Bell size={18} />{alerts > 0 && <em>{alerts}</em>}
            </button>
            <button className="btn btn-primary btn-sm new-order" onClick={() => nav('/orders/new')}><Plus size={16} /><span>New order</span></button>
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>

      <nav className="bottom-nav" aria-label="Quick navigation">
        {[NAV[0], NAV[1], NAV[3], NAV[2]].map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <n.icon size={20} /><span>{n.label}</span>{n.badge && alerts > 0 && <em>{alerts}</em>}
          </NavLink>
        ))}
        <button onClick={() => setOpen(true)}><Ellipsis size={20} /><span>More</span></button>
      </nav>
    </div>
  )
}
