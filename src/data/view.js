// Spoločné výpočty pre obe dátové vrstvy (demo aj Supabase).

export const RESOLVE_AFTER = 3 // koľko „Už funguje“ treba, aby sa problém uzavrel

export function equipmentStatus(yes, no) {
  if (yes === 0 && no === 0) return 'unknown'
  if (yes > no) return 'ano'
  if (no > yes) return 'nie'
  return 'unknown'
}

export function problemStatus(p) {
  if (p.resolvedAt || p.fixed >= RESOLVE_AFTER) return 'resolved'
  if (p.fixed > 0) return 'verifying'
  return 'open'
}

export const STATUS_LABEL = { open: 'Otvorené', verifying: 'Overuje sa', resolved: 'Vyriešené' }

// Čo si zbaliť: tipy z učebne; ak učebňa tipy nemá, odvodíme ich z vybavenia.
export function packItemsForRooms(rooms) {
  const items = []
  for (const r of rooms) {
    if (!r) continue
    if (r.tips.length) {
      r.tips.slice(0, 3).forEach((t) => items.push(t.text))
      continue
    }
    const st = Object.fromEntries(r.equipment.map((e) => [e.key, e.status]))
    if (st.zasuvky === 'nie') items.push('Nabitý notebook')
    if (st.pocitace === 'ano') items.push('Prihlasovacie údaje do školskej siete')
    if (st.wifi === 'nie') items.push('Mobilné dáta')
  }
  return [...new Set(items)]
}

export function topTags(room) {
  if (!room) return []
  if (!room.equipment.length) return ['Zatiaľ bez info']
  const order = { ano: 0, nie: 1, unknown: 2 }
  return [...room.equipment]
    .sort((a, b) => order[a.status] - order[b.status] || b.count - a.count)
    .slice(0, 3)
    .map((e) => (e.status === 'nie' ? `Bez: ${e.label.split(' ')[0].toLowerCase()}` : e.label.split(' (')[0]))
}
