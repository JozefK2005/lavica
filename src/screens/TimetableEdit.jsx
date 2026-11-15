import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../data/api.js'
import { roomBuilding, roomKey, roomNumber, buildingName } from '../data/rooms.js'
import { SAMPLE_TIMETABLE } from '../data/seed.js'
import { getTimetable, newId, saveTimetable, WEEK_LABEL } from '../data/timetable.js'
import { parseIcs } from '../lib/ics.js'
import { DAY_ACC, DAY_SHORT, plural, timeToMinutes } from '../lib/dates.js'
import { readJSON, writeJSON } from '../lib/storage.js'
import { BackButton, Icon, useAsync, useToast } from '../ui.jsx'

const LAST_BUILDING = 'ucebne:lastBuilding'

export default function TimetableEdit() {
  const toast = useToast()
  const [lessons, setLessons] = useState(() => getTimetable())
  const [day, setDay] = useState(0)
  const [form, setForm] = useState(null)
  const fileRef = useRef()
  const data = useAsync(async () => {
    const [buildings, rooms] = await Promise.all([api.listBuildings(), api.listRooms()])
    return { buildings, rooms }
  }, [])
  const buildings = data.data?.buildings || []
  const rooms = data.data?.rooms || []
  const known = new Set(rooms.map((r) => r.id))

  const update = (next) => setLessons(saveTimetable(next))
  const dayLessons = lessons.filter((l) => l.day === day)
  const filled = [0, 1, 2, 3, 4].filter((d) => lessons.some((l) => l.day === d)).length

  function openNew() {
    const building = readJSON(LAST_BUILDING, null) || buildings[0]?.code || ''
    setForm({ editId: null, name: '', building, number: '', from: '', to: '', type: 'Prednáška', week: 'kazdy' })
  }

  function openEdit(l) {
    setForm({ editId: l.id, name: l.name, building: roomBuilding(l.roomId), number: roomNumber(l.roomId), from: l.from, to: l.to || '', type: l.type, week: l.week || 'kazdy' })
  }

  function submit(e) {
    e.preventDefault()
    const f = form
    if (!f.name.trim() || !f.building || !f.number.trim() || !f.from) {
      toast('Vyplň predmet, budovu, učebňu a začiatok', 'error')
      return
    }
    if (f.to && timeToMinutes(f.to) <= timeToMinutes(f.from)) {
      toast('Koniec musí byť po začiatku', 'error')
      return
    }
    const roomId = roomKey(f.building, f.number)
    const lesson = { id: f.editId || newId(), day, name: f.name.trim(), roomId, from: f.from, to: f.to, type: f.type, week: f.week, guessed: false }
    update(f.editId ? lessons.map((l) => (l.id === f.editId ? { ...l, ...lesson } : l)) : [...lessons, lesson])
    writeJSON(LAST_BUILDING, f.building)
    setForm(null)
    const where = `${roomNumber(roomId)} (${buildingName(buildings, f.building, 'short')})`
    toast(known.has(roomId) ? `${f.editId ? 'Uložené' : 'Pridané'}: ${lesson.name} v ${where}` : `Uložené. Učebňu ${where} zatiaľ v appke nemáme.`)
  }

  function remove(id) {
    update(lessons.filter((l) => l.id !== id))
    if (form?.editId === id) setForm(null)
    toast('Hodina odstránená')
  }

  async function onIcs(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const parsed = parseIcs(await file.text(), buildings, buildings[0]?.code || '')
      if (!parsed.length) {
        toast('V súbore sme nenašli žiadne hodiny', 'error')
        return
      }
      update(parsed.map((l) => ({ ...l, id: newId() })))
      const guessed = parsed.filter((l) => l.guessed).length
      toast(
        guessed
          ? `Načítaných ${parsed.length} hodín. Pri ${guessed} sme nespoznali budovu, skontroluj ich.`
          : `Načítaných ${parsed.length} hodín. Skontroluj ich.`,
        guessed ? 'error' : 'ok'
      )
    } catch {
      toast('Súbor sa nepodarilo prečítať', 'error')
    }
  }

  function loadSample() {
    update(SAMPLE_TIMETABLE.map((l) => ({ ...l, id: newId() })))
    toast('Ukážkový rozvrh načítaný')
  }

  // formulár otvorený skôr, než sa načítali budovy – doplníme predvolenú budovu
  useEffect(() => {
    if (form && !form.building && buildings.length) {
      setForm((f) => ({ ...f, building: readJSON(LAST_BUILDING, null) || buildings[0].code }))
    }
  }, [form, buildings])

  const numbersInBuilding = form ? rooms.filter((r) => r.building === form.building) : []

  return (
    <main className="screen no-nav">
      <div className="topbar">
        <BackButton to="/" />
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <h1>Zadaj celý rozvrh naraz</h1>
        <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>
          Stačí raz na semester. Ukladá sa len v tvojom telefóne.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
        <button type="button" className="card stack" style={{ textAlign: 'left', background: 'var(--indigo)', color: '#fff', borderColor: 'var(--indigo)' }} onClick={() => fileRef.current?.click()}>
          <Icon name="upload" color="var(--blue)" />
          <span>
            <b style={{ display: 'block' }}>Import z kalendára</b>
            <span className="small" style={{ color: '#CDEBFF' }}>
              súbor .ics z AIS alebo Google
            </span>
          </span>
        </button>
        <button type="button" className="card stack" style={{ textAlign: 'left' }} onClick={loadSample}>
          <Icon name="calendar" />
          <span>
            <b style={{ display: 'block' }}>Ukážkový rozvrh</b>
            <span className="small muted">na vyskúšanie appky</span>
          </span>
        </button>
      </div>
      <input ref={fileRef} type="file" accept=".ics,text/calendar" onChange={onIcs} className="sr-only" aria-label="Vybrať súbor .ics" tabIndex={-1} />

      <div className="row" style={{ fontSize: 13 }}>
        <div className="grow" style={{ height: 1, background: 'var(--line)' }} />
        <span className="muted">alebo ručne</span>
        <div className="grow" style={{ height: 1, background: 'var(--line)' }} />
      </div>

      <section className="card stack">
        <div className="days" role="group" aria-label="Deň">
          {DAY_SHORT.map((d, i) => {
            const count = lessons.filter((l) => l.day === i).length
            return (
              <button
                key={d}
                type="button"
                className="day"
                style={{ height: 52 }}
                aria-pressed={day === i}
                onClick={() => {
                  setDay(i)
                  setForm(null)
                }}
              >
                <b style={{ fontSize: 15 }}>{d}</b>
                <small>{count ? `${count} h` : '–'}</small>
              </button>
            )
          })}
        </div>

        {dayLessons.length === 0 && !form && (
          <p className="muted small" style={{ textAlign: 'center', margin: '10px 0' }}>
            Na {DAY_ACC[day]} zatiaľ nemáš žiadnu hodinu.
          </p>
        )}

        <div>
          {dayLessons.map((l) => {
            const unknown = data.data && !known.has(l.roomId)
            return (
              <div key={l.id} className="list-row">
                <button type="button" onClick={() => openEdit(l)} className="grow row" style={{ border: 'none', background: 'none', padding: 0, textAlign: 'left', alignItems: 'flex-start' }} aria-label={`Upraviť ${l.name}`}>
                  <b style={{ width: 46, fontSize: 14, flexShrink: 0 }}>{l.from}</b>
                  <div className="grow stack" style={{ gap: 2 }}>
                    <b style={{ fontSize: 15 }}>{l.name}</b>
                    <span className="small muted">
                      {l.type}
                      {l.to ? ` · do ${l.to}` : ''}
                      {l.week && l.week !== 'kazdy' ? ` · ${WEEK_LABEL[l.week].toLowerCase()}` : ''}
                    </span>
                    {(l.guessed || unknown) && (
                      <span className="small" style={{ color: 'var(--warn-strong)', fontWeight: 600 }}>
                        {l.guessed ? 'Skontroluj budovu' : 'Túto učebňu v appke zatiaľ nemáme'}
                      </span>
                    )}
                  </div>
                  <span className="stack" style={{ gap: 2, alignItems: 'flex-end' }}>
                    <span className="room-badge" style={{ fontSize: 13, padding: '4px 8px' }}>
                      {roomNumber(l.roomId)}
                    </span>
                    <span className="small muted">{buildingName(buildings, roomBuilding(l.roomId), 'short')}</span>
                  </span>
                </button>
                <button type="button" className="icon-btn" style={{ border: 'none', background: 'var(--soft)' }} aria-label={`Odstrániť ${l.name}`} onClick={() => remove(l.id)}>
                  <Icon name="close" size={16} />
                </button>
              </div>
            )
          })}
        </div>

        {form ? (
          <form className="stack" onSubmit={submit} style={{ background: 'var(--soft)', borderRadius: 14, padding: 12 }}>
            <div className="field">
              <label htmlFor="f-name">Predmet</label>
              <input id="f-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="napr. Štatistika" autoFocus />
            </div>
            <div className="field">
              <span id="f-building-label" style={{ fontSize: 13, fontWeight: 600, color: '#33363D' }}>
                Budova
              </span>
              <div className="row" role="group" aria-labelledby="f-building-label" style={{ flexWrap: 'wrap', gap: 8 }}>
                {buildings.map((b) => (
                  <button key={b.code} type="button" className="chip" aria-pressed={form.building === b.code} onClick={() => setForm({ ...form, building: b.code })}>
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
              <div className="field">
                <label htmlFor="f-room">Učebňa</label>
                <input id="f-room" className="input" list="rooms-list" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="108" autoCapitalize="characters" />
              </div>
              <div className="field">
                <label htmlFor="f-from">Od</label>
                <input id="f-from" type="time" className="input" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="f-to">Do</label>
                <input id="f-to" type="time" className="input" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
              </div>
            </div>
            <datalist id="rooms-list">
              {numbersInBuilding.map((r) => (
                <option key={r.id} value={r.number}>{r.floor}</option>
              ))}
            </datalist>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8 }}>
              <div className="field">
                <label htmlFor="f-type">Typ</label>
                <select id="f-type" className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option>Prednáška</option>
                  <option>Cvičenie</option>
                  <option>Seminár</option>
                  <option>Laboratórium</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="f-week">Opakovanie</label>
                <select id="f-week" className="input" value={form.week} onChange={(e) => setForm({ ...form, week: e.target.value })}>
                  <option value="kazdy">Každý týždeň</option>
                  <option value="parny">Párny týždeň</option>
                  <option value="neparny">Nepárny týždeň</option>
                </select>
              </div>
            </div>
            <div className="row">
              <button type="button" className="btn small ghost grow" onClick={() => setForm(null)}>
                Zrušiť
              </button>
              <button type="submit" className="btn small primary grow">
                {form.editId ? 'Uložiť' : 'Pridať'}
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="btn dashed" onClick={openNew}>
            + Pridať hodinu na {DAY_ACC[day]}
          </button>
        )}
      </section>

      <div className="row">
        <div className="grow" style={{ height: 6, borderRadius: 3, background: 'var(--line)', overflow: 'hidden' }}>
          <div style={{ width: `${(filled / 5) * 100}%`, height: 6, background: 'var(--indigo)' }} />
        </div>
        <span className="muted small">
          {filled} z 5 {plural(filled, 'dňa', 'dní', 'dní')} vyplnených
        </span>
      </div>

      <Link to="/" className="btn accent block">
        Hotovo
      </Link>
    </main>
  )
}
