// Jednoduchý import rozvrhu z .ics (export z kalendára alebo zo školského systému).
// Berie týždenne opakované udalosti a z miesta (LOCATION) vytiahne číslo učebne.

function unfold(text) {
  return text.replace(/\r?\n[ \t]/g, '')
}

function parseDate(value) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/.exec(value)
  if (!m) return null
  const [, y, mo, d, h = '0', mi = '0', , z] = m
  return z
    ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi))
    : new Date(+y, +mo - 1, +d, +h, +mi)
}

const pad = (n) => String(n).padStart(2, '0')
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

function guessType(summary) {
  const s = summary.toLowerCase()
  if (s.includes('predn')) return 'Prednáška'
  if (s.includes('cvi')) return 'Cvičenie'
  if (s.includes('semin')) return 'Seminár'
  if (s.includes('lab')) return 'Laboratórium'
  return 'Hodina'
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const token = (alias) => new RegExp(`(^|[^\\p{L}\\p{N}])${esc(alias)}(?=$|[^\\p{L}\\p{N}])`, 'u')

// „Letná 9, učebňa 108“ → { roomId: 'L9-108', guessed: false }
// Ak budovu nespoznáme, použijeme fallback a označíme to (guessed: true).
export function roomFromLocation(location, buildings = [], fallback = '') {
  if (!location) return { roomId: '', guessed: true }
  // TUKE píše bloky Letnej 9 aj ako „L9A 204“ / „L9B 520“ → „L9 A204“
  const upper = location.toUpperCase().replace(/(^|[^\p{L}\p{N}])L9\s*-?\s*([AB])[\s_-]*(\d{1,4})/u, '$1L9 $2$3')
  const names = (b) => [b.name.toUpperCase(), ...(b.aliases || [])].sort((x, y) => y.length - x.length)
  const building = buildings.find((b) => names(b).some((a) => token(a).test(upper)))
  let rest = upper.replace(/\//g, '')
  if (building) for (const a of names(building)) rest = rest.replace(token(a), '$1 ')
  const m = /(?:^|[^\p{L}\p{N}])([A-Z]{0,3}\d{1,4}[A-Z]?)(?=$|[^\p{L}\p{N}])/u.exec(rest)
  const number = m ? m[1] : rest.replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const code = building?.code || fallback
  return { roomId: code ? `${code}-${number}` : number, guessed: !building }
}

export function parseIcs(text, buildings = [], fallback = '') {
  const events = []
  const blocks = unfold(text).split('BEGIN:VEVENT').slice(1)
  for (const block of blocks) {
    const body = block.split('END:VEVENT')[0]
    const get = (name) => {
      const m = new RegExp(`^${name}(?:;[^:\\n]*)?:(.*)$`, 'm').exec(body)
      return m ? m[1].trim().replace(/\\,/g, ',').replace(/\\n/gi, ' ') : ''
    }
    const start = parseDate(get('DTSTART'))
    const end = parseDate(get('DTEND'))
    if (!start) continue
    const weekday = start.getDay()
    if (weekday < 1 || weekday > 5) continue
    const rrule = get('RRULE')
    const interval = /INTERVAL=(\d+)/.exec(rrule)?.[1]
    const summary = get('SUMMARY') || 'Hodina'
    const place = roomFromLocation(get('LOCATION'), buildings, fallback)
    events.push({
      day: weekday - 1,
      from: hhmm(start),
      to: end ? hhmm(end) : '',
      name: summary.replace(/\s*\((predn[^)]*|cvi[^)]*|semin[^)]*)\)\s*/i, '').trim() || summary,
      type: guessType(summary),
      roomId: place.roomId,
      guessed: place.guessed,
      week: interval === '2' ? (isoWeekOf(start) % 2 === 0 ? 'parny' : 'neparny') : 'kazdy'
    })
  }
  // rovnaké hodiny (rovnaký deň, čas, učebňa) zlúčime – .ics často obsahuje každý týždeň zvlášť
  const seen = new Set()
  return events.filter((e) => {
    const k = `${e.day}|${e.from}|${e.roomId}|${e.name}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function isoWeekOf(d) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = x.getUTCDay() || 7
  x.setUTCDate(x.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(x.getUTCFullYear(), 0, 1))
  return Math.ceil(((x - yearStart) / 86400000 + 1) / 7)
}
