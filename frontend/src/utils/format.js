export const inr = (n = 0, compact = false) => {
  const v = Number(n) || 0
  if (compact && Math.abs(v) >= 100000) {
    return '₹' + (v >= 10000000 ? (v / 10000000).toFixed(2) + ' Cr' : (v / 100000).toFixed(2) + ' L')
  }
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}
export const num = (n = 0) => Number(n || 0).toLocaleString('en-IN')

export const fmtDate = (d, withTime = false) =>
  new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })

export const timeAgo = (d) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d)) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`
  if (s < 604800) return `${Math.floor(s / 86400)} d ago`
  return fmtDate(d)
}

export const shortDay = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })
export const dayMonth = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

export const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export const downloadBlob = (data, filename) => {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
