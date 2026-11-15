import { useCallback, useEffect, useRef, useState } from 'react'
import { errMsg } from '../api'

export function useDebounce(value, delay = 350) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

// Close a modal with Escape and lock page scroll while it is open
export function useModalBehavior(onClose) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])
}

// Tiny data-fetching hook: const { data, loading, error, reload } = useApi(() => api.get('/x'), [deps])
export function useApi(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const fnRef = useRef(fn)
  fnRef.current = fn
  const seq = useRef(0)

  const run = useCallback(async () => {
    const mine = ++seq.current
    setState((s) => ({ ...s, loading: true, error: '' }))
    try {
      const res = await fnRef.current()
      if (mine === seq.current) setState({ data: res.data, loading: false, error: '' })
    } catch (err) {
      if (mine === seq.current) setState((s) => ({ ...s, loading: false, error: errMsg(err, 'Failed to load') }))
    }
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run() }, deps)
  return { ...state, reload: run }
}

// Page number that automatically falls back to 1 whenever the filter key changes
// (no effect needed, so there is no extra request with a stale page).
export function usePage(filterKey) {
  const [state, setState] = useState({ key: filterKey, page: 1 })
  const page = state.key === filterKey ? state.page : 1
  const setPage = useCallback((p) => setState({ key: filterKey, page: p }), [filterKey])
  return [page, setPage]
}
