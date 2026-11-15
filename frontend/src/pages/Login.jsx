import { useState } from 'react'
import { ArrowRight, Boxes, Eye, EyeOff, Lock, Mail, User, ScanBarcode, Truck, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { errMsg } from '../api'

const DEMO = import.meta.env.VITE_SHOW_DEMO !== 'false'

export default function Login() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') await login(form.email.trim(), form.password)
      else await register(form.name.trim(), form.email.trim(), form.password)
    } catch (err) {
      setError(errMsg(err, 'Could not sign you in'))
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <section className="auth-hero" aria-hidden>
        <div className="brand"><div className="brand-mark"><Boxes size={22} /></div><div><strong>stock<span>pilot</span></strong><small>INVENTORY · ORDERS</small></div></div>
        <div className="hero-copy">
          <div className="eyebrow"><i /> WAREHOUSE CONTROL ROOM</div>
          <h2>Know what you have.<br />Sell what you<br /><em>actually</em> have.</h2>
          <p>Live stock, automatic order deductions and low-stock alerts, all in one place.</p>
        </div>
        <div className="pallet">
          {Array.from({ length: 24 }, (_, i) => <i key={i} style={{ animationDelay: `${(i % 8) * 0.18 + Math.floor(i / 8) * 0.4}s`, height: `${28 + ((i * 37) % 58)}%` }} />)}
        </div>
        <ul className="hero-points">
          <li><ScanBarcode size={16} /> Stock ledger for every unit in &amp; out</li>
          <li><Truck size={16} /> Orders that update stock automatically</li>
          <li><ShieldCheck size={16} /> Role-based access for admins and staff</li>
        </ul>
      </section>

      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit} noValidate>
          <div className="auth-brand-mobile brand"><div className="brand-mark"><Boxes size={20} /></div><strong>stock<span>pilot</span></strong></div>
          <div className="eyebrow"><i /> {mode === 'login' ? 'WELCOME BACK' : 'CREATE ACCOUNT'}</div>
          <h1>{mode === 'login' ? 'Sign in' : 'Get started'}<span>.</span></h1>
          <p className="auth-sub">{mode === 'login' ? 'Enter your details to open your workspace.' : 'New accounts start as staff. An admin can change your role later.'}</p>

          <div className="seg-toggle" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setError('') }}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setError('') }}>Register</button>
          </div>

          {mode === 'register' && (
            <label className="input-icon"><User size={17} /><input placeholder="Full name" value={form.name} onChange={set('name')} autoComplete="name" required /></label>
          )}
          <label className="input-icon"><Mail size={17} /><input type="email" placeholder="Email address" value={form.email} onChange={set('email')} autoComplete="email" required /></label>
          <label className="input-icon">
            <Lock size={17} />
            <input type={show ? 'text' : 'password'} placeholder={mode === 'register' ? 'Password (min 8 characters)' : 'Password'} value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
            <button type="button" className="eye" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </label>

          {error && <div className="form-error" role="alert">{error}</div>}

          <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}<ArrowRight size={18} /></button>

          {DEMO && mode === 'login' && (
            <div className="demo">
              <span>Try a demo account</span>
              <div>
                <button type="button" onClick={() => setForm({ ...form, email: 'admin@stockpilot.com', password: 'Admin@123' })}>Admin</button>
                <button type="button" onClick={() => setForm({ ...form, email: 'staff@stockpilot.com', password: 'Staff@123' })}>Staff</button>
              </div>
            </div>
          )}
        </form>
      </section>
    </div>
  )
}
