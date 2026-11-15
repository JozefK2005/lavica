export const DAY_NAMES = ['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok']
export const DAY_SHORT = ['Po', 'Ut', 'St', 'Št', 'Pi']
export const DAY_ACC = ['pondelok', 'utorok', 'stredu', 'štvrtok', 'piatok']

export function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

// 0 = pondelok … 4 = piatok, víkend = -1
export function weekdayIndex(d) {
  const w = d.getDay()
  return w >= 1 && w <= 5 ? w - 1 : -1
}

// Deň, ktorý appka ukáže po otvorení: zajtra, cez víkend najbližší pondelok.
export function defaultTargetDate(now = new Date()) {
  let d = addDays(startOfDay(now), 1)
  while (weekdayIndex(d) === -1) d = addDays(d, 1)
  return d
}

export function mondayOf(d) {
  const x = startOfDay(d)
  const w = x.getDay() === 0 ? 7 : x.getDay()
  return addDays(x, 1 - w)
}

export function isoWeek(d) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = x.getUTCDay() || 7
  x.setUTCDate(x.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(x.getUTCFullYear(), 0, 1))
  return Math.ceil(((x - yearStart) / 86400000 + 1) / 7)
}

export function sameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

export function dateKey(d) {
  const x = startOfDay(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

export function relativeLabel(d, now = new Date()) {
  if (sameDay(d, now)) return 'Dnes'
  if (sameDay(d, addDays(now, 1))) return 'Zajtra'
  return DAY_NAMES[weekdayIndex(d)] ?? ''
}

export function formatDate(d) {
  return `${d.getDate()}. ${d.getMonth() + 1}.`
}

export function ago(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'dnes'
  if (days === 1) return 'včera'
  if (days < 5) return `pred ${days} dňami`
  if (days < 30) return `pred ${days} dňami`
  const m = Math.floor(days / 30)
  return m === 1 ? 'pred mesiacom' : `pred ${m} mesiacmi`
}

export function timeToMinutes(t) {
  const [h, m] = String(t).split(':').map(Number)
  return h * 60 + (m || 0)
}

export function plural(n, one, few, many) {
  if (n === 1) return one
  if (n >= 2 && n <= 4) return few
  return many
}
