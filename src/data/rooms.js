// ID učebne = kód budovy + číslo, napr. „L9-108“ (Letná 9, učebňa 108).
// Rovnaké číslo tak môže existovať vo viacerých budovách.

export function roomKey(buildingCode, number) {
  return `${String(buildingCode).trim()}-${String(number).trim()}`.toUpperCase()
}

export function roomNumber(id) {
  const s = String(id)
  const i = s.indexOf('-')
  return i < 0 ? s : s.slice(i + 1)
}

export function roomBuilding(id) {
  const s = String(id)
  const i = s.indexOf('-')
  return i < 0 ? '' : s.slice(0, i)
}

export function buildingName(buildings, code, field = 'name') {
  return buildings?.find((b) => b.code === code)?.[field] ?? code
}

// „108 · Letná 9“
export function roomLabel(id, buildings, field = 'short') {
  const code = roomBuilding(id)
  return code ? `${roomNumber(id)} · ${buildingName(buildings, code, field)}` : roomNumber(id)
}
