// localStorage môže v súkromnom okne zlyhať – vtedy držíme dáta v pamäti.
const memory = new Map()

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw != null) return JSON.parse(raw)
  } catch {
    if (memory.has(key)) return memory.get(key)
  }
  return fallback
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    memory.set(key, value)
    return false
  }
}
