import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'

const ToastContext = createContext(null)
let id = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((tid) => setToasts((t) => t.filter((x) => x.id !== tid)), [])
  const push = useCallback((type, message) => {
    const tid = ++id
    setToasts((t) => [...t.slice(-3), { id: tid, type, message }])
    setTimeout(() => remove(tid), type === 'error' ? 6000 : 3500)
  }, [remove])

  const api = useMemo(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }),
    [push],
  )
  const Icon = { success: CheckCircle2, error: CircleAlert, info: Info }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => {
          const I = Icon[t.type]
          return (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <I size={18} />
              <span>{t.message}</span>
              <button aria-label="Dismiss" onClick={() => remove(t.id)}><X size={14} /></button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)
