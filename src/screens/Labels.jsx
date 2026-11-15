import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { api } from '../data/api.js'
import { BackButton, Icon, Loading, useAsync } from '../ui.jsx'

// Odkaz, ktorý bude v QR kóde: otvorí priamo detail učebne v appke.
export function roomUrl(id) {
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#/u/${encodeURIComponent(id)}`
}

export default function Labels() {
  const data = useAsync(async () => {
    const [buildings, rooms] = await Promise.all([api.listBuildings(), api.listRooms()])
    return { buildings, rooms }
  }, [])
  const [codes, setCodes] = useState({})
  const [building, setBuilding] = useState('all')

  useEffect(() => {
    const rooms = data.data?.rooms
    if (!rooms) return
    let alive = true
    Promise.all(rooms.map((r) => QRCode.toDataURL(roomUrl(r.id), { margin: 1, width: 240, color: { dark: '#232528', light: '#FFFFFF' } }))).then((urls) => {
      if (alive) setCodes(Object.fromEntries(rooms.map((r, i) => [r.id, urls[i]])))
    })
    return () => {
      alive = false
    }
  }, [data.data])

  const buildings = data.data?.buildings || []
  const rooms = (data.data?.rooms || []).filter((r) => building === 'all' || r.building === building)

  return (
    <main className="screen no-nav">
      <div className="topbar no-print">
        <BackButton to="/ucebne" />
      </div>
      <div className="stack no-print" style={{ gap: 8 }}>
        <h1 style={{ fontSize: 30 }}>QR štítky na dvere</h1>
        <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>
          Každý kód otvorí detail učebne. Funguje aj obyčajným fotoaparátom v mobile, bez nainštalovanej appky.
        </p>
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
        <button type="button" className="btn primary block" onClick={() => window.print()}>
          <Icon name="print" /> Vytlačiť
        </button>
      </div>
      {data.loading && !data.data && <Loading />}
      <div className="labels">
        {rooms.map((r) => (
          <div key={r.id} className="label-card">
            {codes[r.id] ? <img src={codes[r.id]} alt={`QR kód učebne ${r.number}, ${r.buildingName}`} /> : <span style={{ width: 96, height: 96 }} />}
            <div className="stack" style={{ gap: 4 }}>
              <span className="small muted" style={{ fontWeight: 600, letterSpacing: '0.04em' }}>
                {r.buildingName.toUpperCase()}
              </span>
              <b>{r.number}</b>
              <span className="small muted">Naskenuj: čo tu je a nahlás problém</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
