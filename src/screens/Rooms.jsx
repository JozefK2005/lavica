import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../data/api.js'
import { plural } from '../lib/dates.js'
import { readJSON, writeJSON } from '../lib/storage.js'
import { BottomNav, ErrorBox, Icon, Loading, useAsync, useToast } from '../ui.jsx'

const FILTER_KEY = 'ucebne:roomsBuilding'

export default function Rooms() {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [building, setBuildingState] = useState(() => readJSON(FILTER_KEY, 'all'))
  const data = useAsync(async () => {
    const [buildings, rooms] = await Promise.all([api.listBuildings(), api.listRooms()])
    return { buildings, rooms }
  }, [])

  const setBuilding = (b) => {
    setBuildingState(b)
    writeJSON(FILTER_KEY, b)
  }

  const buildings = data.data?.buildings || []
  const query = q.trim().toLowerCase()
  const visible = (data.data?.rooms || []).filter(
    (r) => (building === 'all' || r.building === building) && (!query || `${r.number} ${r.name || ''} ${r.buildingName} ${r.floor}`.toLowerCase().includes(query))
  )
  const groups = buildings
    .map((b) => ({ ...b, rooms: visible.filter((r) => r.building === b.code).sort((x, y) => x.number.localeCompare(y.number, 'sk', { numeric: true })) }))
    .filter((g) => g.rooms.length)

  async function reset() {
    await api.resetDemo()
    data.reload()
    toast('Ukážkové dáta obnovené')
  }

  return (
    <>
      <main className="screen">
        <h1>Učebne</h1>

        <div className="row" role="group" aria-label="Budova" style={{ flexWrap: 'wrap', gap: 8 }}>
          <button type="button" className="chip" aria-pressed={building === 'all'} onClick={() => setBuilding('all')}>
            Všetky
          </button>
          {buildings.map((b) => (
            <button key={b.code} type="button" className="chip" aria-pressed={building === b.code} onClick={() => setBuilding(b.code)}>
              {b.name}
            </button>
          ))}
        </div>

        <div className="field">
          <label htmlFor="room-q" className="sr-only">
            Hľadať učebňu
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: 14, color: 'var(--muted)' }}>
              <Icon name="search" />
            </span>
            <input id="room-q" className="input" style={{ paddingLeft: 44 }} placeholder="Číslo alebo názov učebne" value={q} onChange={(e) => setQ(e.target.value)} inputMode="search" />
          </div>
        </div>

        {data.loading && !data.data && <Loading />}
        {data.error && <ErrorBox error={data.error} onRetry={data.reload} />}

        {groups.map((g) => (
          <section key={g.code} className="stack" style={{ gap: 10 }} aria-labelledby={`b-${g.code}`}>
            <div className="row between" style={{ alignItems: 'baseline' }}>
              <h2 id={`b-${g.code}`}>{g.name}</h2>
              <span className="small muted">
                {g.rooms.length} {plural(g.rooms.length, 'učebňa', 'učebne', 'učební')}
              </span>
            </div>
            {g.rooms.map((r) => (
              <Link key={r.id} to={`/u/${encodeURIComponent(r.id)}`} className="card row" style={{ textDecoration: 'none', color: 'inherit' }}>
                <span className="room-badge" style={{ minWidth: 56, textAlign: 'center', fontSize: 18 }}>
                  {r.number}
                </span>
                <div className="grow stack" style={{ gap: 2 }}>
                  <b>{r.name || r.floor}</b>
                  <span className="small muted">{[r.name ? r.floor : '', r.seats ? `${r.seats} miest` : '', !r.hasInfo ? 'zatiaľ bez info' : ''].filter(Boolean).join(' · ')}</span>
                </div>
                {r.openProblems > 0 && (
                  <span className="status open">
                    {r.openProblems} {plural(r.openProblems, 'problém', 'problémy', 'problémov')}
                  </span>
                )}
                <Icon name="next" size={18} color="var(--muted)" />
              </Link>
            ))}
          </section>
        ))}
        {data.data && groups.length === 0 && <p className="muted">Učebňu „{q}“ sme v tejto budove nenašli.</p>}

        <div className="stack" style={{ marginTop: 8 }}>
          <Link to="/stitky" className="btn ghost block">
            <Icon name="print" /> QR štítky na dvere
          </Link>
          {api.mode === 'demo' && (
            <div className="card dashed stack">
              <span className="small muted">Demo režim: budovy a učebne sú skutočné, vybavenie, tipy a hlásenia sú len ukážkové a ukladajú sa v tomto prehliadači.</span>
              <button type="button" className="btn small ghost" onClick={reset}>
                Obnoviť ukážkové dáta
              </button>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </>
  )
}
