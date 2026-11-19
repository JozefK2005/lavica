import { api } from '../data/api.js'
import { buildingName, roomBuilding, roomKey, roomNumber } from '../data/rooms.js'
import { SAMPLE_TIMETABLE } from '../data/seed.js'
import { getTimetable, newId, saveTimetable, WEEK_LABEL } from '../data/timetable.js'
import { parseIcs } from '../lib/ics.js'
import { DAY_ACC, DAY_SHORT, timeToMinutes } from '../lib/dates.js'
import { readJSON, writeJSON } from '../lib/storage.js'
import { backButton, esc, icon, link, plural, toast } from '../ui.js'

const LAST_BUILDING = 'ucebne:lastBuilding'
const TYPES = ['Prednáška', 'Cvičenie', 'Seminár', 'Laboratórium']

export default function timetableEdit(root) {
  let lessons = getTimetable()
  let day = 0
  let form = null // otvorený formulár: { editId, name, building, number, from, to, type, week }
  let buildings = []
  let rooms = []

  const known = () => new Set(rooms.map((r) => r.id))
  const update = (next) => (lessons = saveTimetable(next))

  // pred každým prekreslením si zapamätáme, čo je napísané vo formulári
  function syncForm() {
    if (!form) return
    for (const key of ['name', 'number', 'from', 'to', 'type', 'week']) {
      const el = root.querySelector(`[name="${key}"]`)
      if (el) form[key] = el.value
    }
  }

  function draw() {
    syncForm()
    const dayLessons = lessons.filter((l) => l.day === day)
    const filled = [0, 1, 2, 3, 4].filter((d) => lessons.some((l) => l.day === d)).length
    const knownIds = known()
    root.innerHTML = `
      <main class="screen no-nav">
        <div class="topbar">${backButton('/')}</div>
        <div class="stack" style="gap:8px">
          <h1>Zadaj celý rozvrh naraz</h1>
          <p class="muted" style="margin:0;line-height:1.5">Stačí raz na semester. Ukladá sa len v tvojom telefóne.</p>
        </div>

        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
          <button type="button" class="card stack" data-action="ics" style="text-align:left;background:var(--indigo);color:#fff;border-color:var(--indigo)">
            ${icon('upload', { color: 'var(--blue)' })}
            <span><b style="display:block">Import z kalendára</b><span class="small" style="color:#CDEBFF">súbor .ics z AIS alebo Google</span></span>
          </button>
          <button type="button" class="card stack" data-action="sample" style="text-align:left">
            ${icon('calendar')}
            <span><b style="display:block">Ukážkový rozvrh</b><span class="small muted">na vyskúšanie appky</span></span>
          </button>
        </div>
        <input id="ics-file" type="file" accept=".ics,text/calendar" class="sr-only" aria-label="Vybrať súbor .ics" tabindex="-1">

        <div class="row" style="font-size:13px">
          <div class="grow" style="height:1px;background:var(--line)"></div><span class="muted">alebo ručne</span><div class="grow" style="height:1px;background:var(--line)"></div>
        </div>

        <section class="card stack">
          <div class="days" role="group" aria-label="Deň">
            ${DAY_SHORT.map((d, i) => {
              const count = lessons.filter((l) => l.day === i).length
              return `<button type="button" class="day" style="height:52px" aria-pressed="${day === i}" data-action="day" data-i="${i}">
                <b style="font-size:15px">${d}</b><small>${count ? `${count} h` : '–'}</small></button>`
            }).join('')}
          </div>

          ${dayLessons.length === 0 && !form ? `<p class="muted small" style="text-align:center;margin:10px 0">Na ${DAY_ACC[day]} zatiaľ nemáš žiadnu hodinu.</p>` : ''}

          <div>
            ${dayLessons
              .map((l) => {
                const unknown = rooms.length && !knownIds.has(l.roomId)
                return `
              <div class="list-row">
                <button type="button" class="grow row" data-action="edit" data-id="${esc(l.id)}" aria-label="Upraviť ${esc(l.name)}" style="border:none;background:none;padding:0;text-align:left;align-items:flex-start">
                  <b style="width:46px;font-size:14px;flex-shrink:0">${esc(l.from)}</b>
                  <div class="grow stack" style="gap:2px">
                    <b style="font-size:15px">${esc(l.name)}</b>
                    <span class="small muted">${esc(l.type)}${l.to ? ` · do ${esc(l.to)}` : ''}${l.week && l.week !== 'kazdy' ? ` · ${WEEK_LABEL[l.week].toLowerCase()}` : ''}</span>
                    ${l.guessed || unknown ? `<span class="small" style="color:var(--warn-strong);font-weight:600">${l.guessed ? 'Skontroluj budovu' : 'Túto učebňu v appke zatiaľ nemáme'}</span>` : ''}
                  </div>
                  <span class="stack" style="gap:2px;align-items:flex-end">
                    <span class="room-badge" style="font-size:13px;padding:4px 8px">${esc(roomNumber(l.roomId))}</span>
                    <span class="small muted">${esc(buildingName(buildings, roomBuilding(l.roomId), 'short'))}</span>
                  </span>
                </button>
                <button type="button" class="icon-btn" style="border:none;background:var(--soft)" aria-label="Odstrániť ${esc(l.name)}" data-action="remove" data-id="${esc(l.id)}">${icon('close', { size: 16 })}</button>
              </div>`
              })
              .join('')}
          </div>

          ${form ? formHtml() : `<button type="button" class="btn dashed" data-action="new">+ Pridať hodinu na ${DAY_ACC[day]}</button>`}
        </section>

        <div class="row">
          <div class="grow" style="height:6px;border-radius:3px;background:var(--line);overflow:hidden"><div style="width:${(filled / 5) * 100}%;height:6px;background:var(--indigo)"></div></div>
          <span class="muted small">${filled} z 5 ${plural(filled, 'dňa', 'dní', 'dní')} vyplnených</span>
        </div>

        <a href="${link('/')}" class="btn accent block">Hotovo</a>
      </main>`
  }

  function formHtml() {
    const f = form
    const inBuilding = rooms.filter((r) => r.building === f.building)
    const sel = (value, current) => (value === current ? 'selected' : '')
    return `
      <form class="stack" id="lesson-form" style="background:var(--soft);border-radius:14px;padding:12px" novalidate>
        <div class="field">
          <label for="f-name">Predmet</label>
          <input id="f-name" name="name" class="input" value="${esc(f.name)}" placeholder="napr. Štatistika">
        </div>
        <div class="field">
          <span id="f-building-label" style="font-size:13px;font-weight:600;color:#33363D">Budova</span>
          <div class="row" role="group" aria-labelledby="f-building-label" style="flex-wrap:wrap;gap:8px">
            ${buildings.map((b) => `<button type="button" class="chip" aria-pressed="${f.building === b.code}" data-action="building" data-code="${esc(b.code)}">${esc(b.name)}</button>`).join('')}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
          <div class="field"><label for="f-room">Učebňa</label><input id="f-room" name="number" class="input" list="rooms-list" value="${esc(f.number)}" placeholder="108" autocapitalize="characters"></div>
          <div class="field"><label for="f-from">Od</label><input id="f-from" name="from" type="time" class="input" value="${esc(f.from)}"></div>
          <div class="field"><label for="f-to">Do</label><input id="f-to" name="to" type="time" class="input" value="${esc(f.to)}"></div>
        </div>
        <datalist id="rooms-list">${inBuilding.map((r) => `<option value="${esc(r.number)}">${esc(r.name || r.floor)}</option>`).join('')}</datalist>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
          <div class="field"><label for="f-type">Typ</label>
            <select id="f-type" name="type" class="input">${TYPES.map((t) => `<option ${sel(t, f.type)}>${t}</option>`).join('')}</select>
          </div>
          <div class="field"><label for="f-week">Opakovanie</label>
            <select id="f-week" name="week" class="input">
              <option value="kazdy" ${sel('kazdy', f.week)}>Každý týždeň</option>
              <option value="parny" ${sel('parny', f.week)}>Párny týždeň</option>
              <option value="neparny" ${sel('neparny', f.week)}>Nepárny týždeň</option>
            </select>
          </div>
        </div>
        <div class="row">
          <button type="button" class="btn small ghost grow" data-action="cancel">Zrušiť</button>
          <button type="submit" class="btn small primary grow">${f.editId ? 'Uložiť' : 'Pridať'}</button>
        </div>
      </form>`
  }

  function defaultBuilding() {
    return readJSON(LAST_BUILDING, null) || buildings[0]?.code || ''
  }

  function submitForm() {
    syncForm()
    const f = form
    if (!f.building) f.building = defaultBuilding()
    if (!f.name.trim() || !f.building || !f.number.trim() || !f.from) return toast('Vyplň predmet, budovu, učebňu a začiatok', 'error')
    if (f.to && timeToMinutes(f.to) <= timeToMinutes(f.from)) return toast('Koniec musí byť po začiatku', 'error')
    const roomId = roomKey(f.building, f.number)
    const lesson = { id: f.editId || newId(), day, name: f.name.trim(), roomId, from: f.from, to: f.to, type: f.type, week: f.week, guessed: false }
    update(f.editId ? lessons.map((l) => (l.id === f.editId ? { ...l, ...lesson } : l)) : [...lessons, lesson])
    writeJSON(LAST_BUILDING, f.building)
    const where = `${roomNumber(roomId)} (${buildingName(buildings, f.building, 'short')})`
    const msg = known().has(roomId) ? `${f.editId ? 'Uložené' : 'Pridané'}: ${lesson.name} v ${where}` : `Uložené. Učebňu ${where} zatiaľ v appke nemáme.`
    form = null
    draw()
    toast(msg)
  }

  async function importIcs(file) {
    try {
      const parsed = parseIcs(await file.text(), buildings, buildings[0]?.code || '')
      if (!parsed.length) return toast('V súbore sme nenašli žiadne hodiny', 'error')
      update(parsed.map((l) => ({ ...l, id: newId() })))
      form = null
      draw()
      const guessed = parsed.filter((l) => l.guessed).length
      toast(
        guessed ? `Načítaných ${parsed.length} hodín. Pri ${guessed} sme nespoznali budovu, skontroluj ich.` : `Načítaných ${parsed.length} hodín. Skontroluj ich.`,
        guessed ? 'error' : 'ok'
      )
    } catch {
      toast('Súbor sa nepodarilo prečítať', 'error')
    }
  }

  root.onclick = (e) => {
    const btn = e.target.closest('[data-action]')
    if (!btn) return
    const action = btn.dataset.action
    if (action === 'ics') root.querySelector('#ics-file').click()
    if (action === 'sample') {
      update(SAMPLE_TIMETABLE.map((l) => ({ ...l, id: newId() })))
      form = null
      draw()
      toast('Ukážkový rozvrh načítaný')
    }
    if (action === 'day') {
      day = Number(btn.dataset.i)
      form = null
      draw()
    }
    if (action === 'new') {
      form = { editId: null, name: '', building: defaultBuilding(), number: '', from: '', to: '', type: 'Prednáška', week: 'kazdy' }
      draw()
      root.querySelector('#f-name')?.focus()
    }
    if (action === 'edit') {
      const l = lessons.find((x) => x.id === btn.dataset.id)
      form = { editId: l.id, name: l.name, building: roomBuilding(l.roomId), number: roomNumber(l.roomId), from: l.from, to: l.to || '', type: l.type, week: l.week || 'kazdy' }
      draw()
    }
    if (action === 'remove') {
      if (form?.editId === btn.dataset.id) form = null
      update(lessons.filter((l) => l.id !== btn.dataset.id))
      draw()
      toast('Hodina odstránená')
    }
    if (action === 'building') {
      syncForm()
      form.building = btn.dataset.code
      draw()
    }
    if (action === 'cancel') {
      form = null
      draw()
    }
  }

  root.onsubmit = (e) => {
    e.preventDefault()
    submitForm()
  }

  root.onchange = (e) => {
    if (e.target.id !== 'ics-file') return
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) importIcs(file)
  }

  draw()
  Promise.all([api.listBuildings(), api.listRooms()])
    .then(([b, r]) => {
      buildings = b
      rooms = r
      if (form && !form.building) form.building = defaultBuilding()
      draw()
    })
    .catch((e) => toast(e.message || 'Nepodarilo sa načítať učebne', 'error'))
}
