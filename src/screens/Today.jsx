import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../data/api.js'
import { getTimetable, lessonsForDate } from '../data/timetable.js'
import { packItemsForRooms, topTags } from '../data/view.js'
import { roomBuilding, roomNumber } from '../data/rooms.js'
import { addDays, dateKey, DAY_NAMES, DAY_SHORT, defaultTargetDate, formatDate, mondayOf, plural, relativeLabel, sameDay } from '../lib/dates.js'
import { readJSON, writeJSON } from '../lib/storage.js'
import { BottomNav, ErrorBox, Icon, Loading, useAsync, useToast } from '../ui.jsx'

export default function Today() {
  const toast = useToast()
  const initial = useMemo(() => defaultTargetDate(), [])
  const [date, setDate] = useState(initial)
  const timetable = useMemo(() => getTimetable(), [])
  const lessons = lessonsForDate(timetable, date)
  const roomIds = [...new Set(lessons.map((l) => l.roomId))]

  const rooms = useAsync(async () => {
    const list = await Promise.all(roomIds.map((id) => api.getRoom(id)))
    return Object.fromEntries(roomIds.map((id, i) => [id, list[i]]))
  }, [roomIds.join(',')])

  const monday = mondayOf(date)
  const week = [0, 1, 2, 3, 4].map((i) => addDays(monday, i))

  const packKey = `ucebne:pack:${dateKey(date)}`
  const [packed, setPacked] = useState(() => readJSON(packKey, {}))
  const [packFor, setPackFor] = useState(packKey)
  if (packFor !== packKey) {
    setPackFor(packKey)
    setPacked(readJSON(packKey, {}))
  }
  const packItems = rooms.data ? packItemsForRooms(roomIds.map((id) => rooms.data[id])) : []
  const doneCount = packItems.filter((p) => packed[p]).length

  function togglePack(item) {
    const next = { ...packed, [item]: !packed[item] }
    setPacked(next)
    writeJSON(packKey, next)
    if (packItems.every((p) => next[p])) toast('Všetko máš zbalené')
  }

  const rel = relativeLabel(date)
  const isTarget = sameDay(date, initial)

  if (timetable.length === 0) {
    return (
      <>
        <main className="screen">
          <div className="stack" style={{ gap: 4 }}>
            <span className="eyebrow">Vitaj v Lavici</span>
            <h1>Najprv zadaj rozvrh</h1>
          </div>
          <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>
            Rozvrh zadáš raz na celý semester. Potom ti appka každý večer ukáže, čo ťa zajtra čaká, v ktorej učebni a čo si zbaliť.
          </p>
          <Link to="/rozvrh" className="btn primary block">
            Zadať rozvrh
          </Link>
          <Link to="/ucebne" className="btn ghost block">
            Najprv si pozrieť učebne
          </Link>
        </main>
        <BottomNav />
      </>
    )
  }

  return (
    <>
      <main className="screen">
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div className="stack" style={{ gap: 2 }}>
            <span className="eyebrow">
              {rel === 'Dnes' || rel === 'Zajtra' ? `${DAY_NAMES[week.findIndex((d) => sameDay(d, date))]} ${formatDate(date)}` : formatDate(date)}
            </span>
            <h1>{rel}</h1>
          </div>
          <Link to="/rozvrh" className="icon-btn" aria-label="Upraviť rozvrh">
            <Icon name="edit" />
          </Link>
        </div>

        <div className="days" role="group" aria-label="Deň v týždni">
          {week.map((d, i) => (
            <button key={i} type="button" className="day" aria-pressed={sameDay(d, date)} onClick={() => setDate(d)}>
              <small>{DAY_SHORT[i]}</small>
              <b>{d.getDate()}</b>
            </button>
          ))}
        </div>

        <div className="row between">
          <span className="muted" style={{ fontSize: 14 }}>
            {lessons.length
              ? `${lessons.length} ${plural(lessons.length, 'hodina', 'hodiny', 'hodín')} · začínaš ${lessons[0].from} v ${roomNumber(lessons[0].roomId)}, ${rooms.data?.[lessons[0].roomId]?.buildingShort ?? roomBuilding(lessons[0].roomId)}`
              : 'Na tento deň nemáš žiadne hodiny'}
          </span>
          {!isTarget && (
            <button type="button" className="chip" onClick={() => setDate(initial)}>
              Späť na {relativeLabel(initial).toLowerCase()}
            </button>
          )}
        </div>

        {rooms.error && <ErrorBox error={rooms.error} onRetry={rooms.reload} />}

        {lessons.length > 0 && (
          <section className="card accent stack" aria-labelledby="pack-title">
            <div className="row between">
              <div className="row">
                <Icon name="bag" />
                <h2 id="pack-title" style={{ fontSize: 18 }}>
                  {rel === 'Zajtra' ? 'Na zajtra si zbaľ' : 'Na tento deň si zbaľ'}
                </h2>
              </div>
              {packItems.length > 0 && (
                <b style={{ fontSize: 13 }}>
                  {doneCount} / {packItems.length}
                </b>
              )}
            </div>
            {rooms.loading && !rooms.data ? (
              <span className="small">Pozerám, čo je v učebniach…</span>
            ) : packItems.length ? (
              packItems.map((item) => (
                <label key={item} className={`check ${packed[item] ? 'done' : ''}`}>
                  <input type="checkbox" checked={!!packed[item]} onChange={() => togglePack(item)} />
                  <span>{item}</span>
                </label>
              ))
            ) : (
              <span style={{ fontSize: 15 }}>Nič extra netreba. O učebniach zatiaľ nikto nič nepridal.</span>
            )}
          </section>
        )}

        <div className="stack" style={{ gap: 12 }}>
          {lessons.map((l) => {
            const room = rooms.data?.[l.roomId]
            const open = room?.problems.filter((p) => p.status !== 'resolved') ?? []
            return (
              <Link key={l.id} to={`/u/${encodeURIComponent(l.roomId)}`} className="card lesson">
                <div className="time">
                  <b style={{ fontSize: 16 }}>{l.from}</b>
                  <span className="muted small">{l.to}</span>
                </div>
                <div className="grow stack">
                  <div className="row between" style={{ alignItems: 'flex-start' }}>
                    <div className="stack" style={{ gap: 2 }}>
                      <b style={{ fontSize: 16 }}>{l.name}</b>
                      <span className="muted small">
                        {l.type}
                        {room ? ` · ${room.buildingShort}` : ''}
                      </span>
                    </div>
                    <span className="room-badge">{roomNumber(l.roomId)}</span>
                  </div>
                  {room === null && (
                    <span className="small muted">
                      Učebňu {roomNumber(l.roomId)} ({roomBuilding(l.roomId)}) zatiaľ v appke nemáme
                    </span>
                  )}
                  {room && (
                    <div className="tags">
                      {topTags(room).map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {open.length > 0 && (
                    <div className="warn-line">
                      <Icon name="warn" size={16} color="var(--warn-strong)" stroke={2.2} />
                      {open[0].text}
                      {open.length > 1 ? ` (+${open.length - 1})` : ''}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
          {rooms.loading && !rooms.data && lessons.length > 0 && <Loading />}
        </div>
      </main>
      <BottomNav />
    </>
  )
}
