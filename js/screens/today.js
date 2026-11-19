import { api } from '../data/api.js'
import { getTimetable, lessonsForDate } from '../data/timetable.js'
import { packItemsForRooms, topTags } from '../data/view.js'
import { roomBuilding, roomNumber } from '../data/rooms.js'
import { addDays, dateKey, DAY_NAMES, DAY_SHORT, defaultTargetDate, formatDate, mondayOf, relativeLabel, sameDay } from '../lib/dates.js'
import { readJSON, writeJSON } from '../lib/storage.js'
import { bottomNav, errorHtml, esc, icon, link, plural, roomLink, toast } from '../ui.js'

export default function today(root) {
  const timetable = getTimetable()

  if (timetable.length === 0) {
    root.innerHTML = `
      <main class="screen">
        <div class="stack" style="gap:4px">
          <span class="eyebrow">Vitaj v Lavici</span>
          <h1>Najprv zadaj rozvrh</h1>
        </div>
        <p class="muted" style="margin:0;line-height:1.5">
          Rozvrh zadáš raz na celý semester. Potom ti appka každý večer ukáže, čo ťa zajtra čaká, v ktorej učebni a čo si zbaliť.
        </p>
        <a href="${link('/rozvrh')}" class="btn primary block">Zadať rozvrh</a>
        <a href="${link('/ucebne')}" class="btn ghost block">Najprv si pozrieť učebne</a>
      </main>
      ${bottomNav('rozvrh')}`
    return
  }

  const initial = defaultTargetDate()
  let date = initial
  let rooms = null 
  let error = null
  let packItems = []


  async function load() {
    error = null
    draw()
    try {
      const ids = [...new Set(timetable.map((l) => l.roomId))]
      const list = await Promise.all(ids.map((id) => api.getRoom(id)))
      rooms = Object.fromEntries(ids.map((id, i) => [id, list[i]]))
    } catch (e) {
      error = e
    }
    draw()
  }

  const packKey = () => `ucebne:pack:${dateKey(date)}`

  function draw() {
    const lessons = lessonsForDate(timetable, date)
    const week = [0, 1, 2, 3, 4].map((i) => addDays(mondayOf(date), i))
    const rel = relativeLabel(date)
    const packed = readJSON(packKey(), {})
    packItems = rooms ? packItemsForRooms([...new Set(lessons.map((l) => l.roomId))].map((id) => rooms[id])) : []
    const done = packItems.filter((p) => packed[p]).length
    const first = lessons[0]
    const firstBuilding = first ? rooms?.[first.roomId]?.buildingShort ?? roomBuilding(first.roomId) : ''

    root.innerHTML = `
      <main class="screen">
        <div class="row between" style="align-items:flex-start">
          <div class="stack" style="gap:2px">
            <span class="eyebrow">${rel === 'Dnes' || rel === 'Zajtra' ? `${DAY_NAMES[week.findIndex((d) => sameDay(d, date))]} ${formatDate(date)}` : formatDate(date)}</span>
            <h1>${rel}</h1>
          </div>
          <a href="${link('/rozvrh')}" class="icon-btn" aria-label="Upraviť rozvrh">${icon('edit')}</a>
        </div>

        <div class="days" role="group" aria-label="Deň v týždni">
          ${week
            .map(
              (d, i) => `
            <button type="button" class="day" aria-pressed="${sameDay(d, date)}" data-action="day" data-i="${i}">
              <small>${DAY_SHORT[i]}</small><b>${d.getDate()}</b>
            </button>`
            )
            .join('')}
        </div>

        <div class="row between">
          <span class="muted" style="font-size:14px">
            ${first ? `${lessons.length} ${plural(lessons.length, 'hodina', 'hodiny', 'hodín')} · začínaš ${first.from} v ${esc(roomNumber(first.roomId))}, ${esc(firstBuilding)}` : 'Na tento deň nemáš žiadne hodiny'}
          </span>
          ${sameDay(date, initial) ? '' : `<button type="button" class="chip" data-action="reset">Späť na ${relativeLabel(initial).toLowerCase()}</button>`}
        </div>

        ${error ? errorHtml(error) : ''}

        ${
          lessons.length
            ? `
          <section class="card accent stack" aria-labelledby="pack-title">
            <div class="row between">
              <div class="row">${icon('bag')}<h2 id="pack-title" style="font-size:18px">${rel === 'Zajtra' ? 'Na zajtra si zbaľ' : 'Na tento deň si zbaľ'}</h2></div>
              ${packItems.length ? `<b style="font-size:13px">${done} / ${packItems.length}</b>` : ''}
            </div>
            ${
              !rooms && !error
                ? '<span class="small">Pozerám, čo je v učebniach…</span>'
                : packItems.length
                  ? packItems
                      .map(
                        (item, i) => `
                <label class="check ${packed[item] ? 'done' : ''}">
                  <input type="checkbox" data-pack="${i}" ${packed[item] ? 'checked' : ''}>
                  <span>${esc(item)}</span>
                </label>`
                      )
                      .join('')
                  : '<span style="font-size:15px">Nič extra netreba. O učebniach zatiaľ nikto nič nepridal.</span>'
            }
          </section>`
            : ''
        }

        <div class="stack" style="gap:12px">
          ${lessons.map((l) => lessonCard(l, rooms?.[l.roomId])).join('')}
        </div>
      </main>
      ${bottomNav('rozvrh')}`
  }

  function lessonCard(l, room) {
    const open = room?.problems.filter((p) => p.status !== 'resolved') ?? []
    return `
      <a href="${roomLink(l.roomId)}" class="card lesson">
        <div class="time"><b style="font-size:16px">${esc(l.from)}</b><span class="muted small">${esc(l.to)}</span></div>
        <div class="grow stack">
          <div class="row between" style="align-items:flex-start">
            <div class="stack" style="gap:2px">
              <b style="font-size:16px">${esc(l.name)}</b>
              <span class="muted small">${esc(l.type)}${room ? ` · ${esc(room.buildingShort)}` : ''}</span>
            </div>
            <span class="room-badge">${esc(roomNumber(l.roomId))}</span>
          </div>
          ${room === null ? `<span class="small muted">Učebňu ${esc(roomNumber(l.roomId))} (${esc(roomBuilding(l.roomId))}) zatiaľ v appke nemáme</span>` : ''}
          ${room ? `<div class="tags">${topTags(room).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
          ${
            open.length
              ? `<div class="warn-line">${icon('warn', { size: 16, color: 'var(--warn-strong)', stroke: 2.2 })}${esc(open[0].text)}${open.length > 1 ? ` (+${open.length - 1})` : ''}</div>`
              : ''
          }
        </div>
      </a>`
  }

  root.onclick = (e) => {
    const btn = e.target.closest('[data-action]')
    if (e.target.closest('[data-retry]')) return load()
    if (!btn) return
    if (btn.dataset.action === 'day') {
      date = addDays(mondayOf(date), Number(btn.dataset.i))
      draw()
    }
    if (btn.dataset.action === 'reset') {
      date = initial
      draw()
    }
  }

  root.onchange = (e) => {
    const i = e.target.dataset.pack
    if (i === undefined) return
    const item = packItems[Number(i)]
    const packed = { ...readJSON(packKey(), {}), [item]: e.target.checked }
    writeJSON(packKey(), packed)
    draw()
    if (packItems.every((p) => packed[p])) toast('Všetko máš zbalené')
  }

  load()
}
