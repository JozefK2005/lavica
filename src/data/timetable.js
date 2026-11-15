// Rozvrh je osobný, preto ho držíme len v zariadení študenta.
import { readJSON, writeJSON } from '../lib/storage.js'
import { isoWeek, timeToMinutes, weekdayIndex } from '../lib/dates.js'

const KEY = 'ucebne:timetable:v1'

export function getTimetable() {
  // staršie verzie ukladali len číslo učebne bez budovy – priradíme Letnú 9
  return readJSON(KEY, []).map((l) => (String(l.roomId).includes('-') ? l : { ...l, roomId: `L9-${l.roomId}` }))
}

export function saveTimetable(lessons) {
  const sorted = [...lessons].sort((a, b) => a.day - b.day || timeToMinutes(a.from) - timeToMinutes(b.from))
  writeJSON(KEY, sorted)
  return sorted
}

export function newId() {
  return Math.random().toString(36).slice(2, 10)
}

// Hodiny pre konkrétny dátum – rešpektuje párny/nepárny týždeň.
export function lessonsForDate(lessons, date) {
  const day = weekdayIndex(date)
  if (day < 0) return []
  const even = isoWeek(date) % 2 === 0
  return lessons
    .filter((l) => l.day === day)
    .filter((l) => l.week === 'kazdy' || !l.week || (l.week === 'parny' ? even : !even))
    .sort((a, b) => timeToMinutes(a.from) - timeToMinutes(b.from))
}

export const WEEK_LABEL = { kazdy: 'Každý týždeň', parny: 'Párny týždeň', neparny: 'Nepárny týždeň' }
