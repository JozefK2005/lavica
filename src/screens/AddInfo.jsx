import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../data/api.js'
import { EQUIPMENT_PRESETS } from '../data/seed.js'
import { plural } from '../lib/dates.js'
import { BackButton, ErrorBox, Icon, Loading, useAsync, useToast } from '../ui.jsx'

const OPTIONS = [
  ['ano', 'Áno'],
  ['nie', 'Nie'],
  [null, '?']
]
const MAX_TIP = 80

export default function AddInfo() {
  const { id } = useParams()
  const toast = useToast()
  const room = useAsync(() => api.getRoom(id), [id])
  const [items, setItems] = useState(null) // [{id?, key, label, vote, original}]
  const [photos, setPhotos] = useState([]) // [{file, url}]
  const [tip, setTip] = useState('')
  const [newItem, setNewItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    if (!room.data || items) return
    const existing = room.data.equipment.map((e) => ({ id: e.id, key: e.key, label: e.label, vote: e.myVote, original: e.myVote }))
    const missing = EQUIPMENT_PRESETS.filter((p) => !existing.some((e) => e.key === p.key)).map((p) => ({ id: null, key: p.key, label: p.label, vote: null, original: null }))
    setItems([...existing, ...missing])
  }, [room.data, items])

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos])

  if (room.loading && !room.data)
    return (
      <main className="screen no-nav">
        <BackButton />
        <Loading />
      </main>
    )
  if (room.error || !room.data)
    return (
      <main className="screen no-nav">
        <BackButton />
        <ErrorBox error={room.error || 'Učebňa neexistuje'} />
      </main>
    )

  const r = room.data
  const voteChanges = (items || []).filter((i) => i.vote !== i.original)
  const changes = voteChanges.length + photos.length + (tip.trim() ? 1 : 0)

  function setVote(idx, vote) {
    setItems(items.map((it, i) => (i === idx ? { ...it, vote: it.vote === vote ? null : vote } : it)))
  }

  function addPhotos(e) {
    const files = [...(e.target.files || [])].filter((f) => f.type.startsWith('image/'))
    e.target.value = ''
    if (!files.length) return
    setPhotos([...photos, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))])
    toast(files.length === 1 ? 'Fotka pridaná' : `Pridaných ${files.length} fotiek`)
  }

  function addItem() {
    const label = (newItem || '').trim()
    if (!label) {
      toast('Napíš, o akú vec ide', 'error')
      return
    }
    if (items.some((i) => i.label.toLowerCase() === label.toLowerCase())) {
      toast('Táto vec už v zozname je', 'error')
      return
    }
    setItems([...items, { id: null, key: 'vlastne', label, vote: 'ano', original: null }])
    setNewItem(null)
  }

  async function save() {
    if (!changes) {
      toast('Najprv vyplň aspoň jednu vec', 'error')
      return
    }
    setSaving(true)
    try {
      for (const it of voteChanges) {
        let eqId = it.id
        if (!eqId) {
          if (!it.vote) continue
          eqId = await api.addEquipment(r.id, it.label, it.key)
        }
        await api.voteEquipment(eqId, it.vote)
      }
      for (const p of photos) await api.addPhoto(r.id, p.file)
      if (tip.trim()) await api.addTip(r.id, tip.trim())
      setDone(changes)
    } catch (e) {
      toast(e.message || 'Nepodarilo sa uložiť', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (done != null) {
    return (
      <main className="screen no-nav">
        <div className="success">
          <span className="badge">
            <Icon name="check" size={40} stroke={2.6} />
          </span>
          <h1>Ďakujeme!</h1>
          <p className="muted" style={{ margin: 0, maxWidth: 300, lineHeight: 1.5 }}>
            Pridal si {done} {plural(done, 'zmenu', 'zmeny', 'zmien')} k učebni {r.number} ({r.buildingShort}). Uvidia ich všetci, ktorí tu majú hodinu.
          </p>
          <Link to={`/u/${encodeURIComponent(r.id)}`} className="btn primary block">
            Späť na učebňu
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="screen no-nav">
      <div className="topbar">
        <BackButton />
        <span className="muted" style={{ fontSize: 14 }}>
          Učebňa {r.number} · {r.buildingShort}
        </span>
      </div>
      <h1 style={{ fontSize: 30 }}>Čo je v učebni?</h1>

      <section className="stack" aria-label="Fotky">
        <div className="thumbs">
          {photos.map((p, i) => (
            <div key={p.url} style={{ position: 'relative' }}>
              <img src={p.url} alt={`Nová fotka ${i + 1}`} className="thumb" />
              <button
                type="button"
                aria-label="Odstrániť fotku"
                onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                style={{ position: 'absolute', top: -8, right: -8, width: 30, height: 30, borderRadius: 15, border: '2px solid var(--bg)', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
              >
                <Icon name="close" size={12} color="#fff" stroke={3} />
              </button>
            </div>
          ))}
          <button type="button" className={photos.length ? 'thumb' : 'card dashed'} onClick={() => fileRef.current?.click()} style={photos.length ? { border: '1.5px dashed #A9C3D9', background: 'transparent' } : { width: '100%', height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--blue)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="camera" />
            </span>
            {!photos.length && <b style={{ fontSize: 14 }}>Pridať fotky učebne</b>}
            {photos.length > 0 && <span className="sr-only">Pridať ďalšiu fotku</span>}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={addPhotos} className="sr-only" tabIndex={-1} aria-hidden="true" />
        <span className="small muted">Odfoť tabuľu, zásuvky a výhľad z lavíc. Prosím bez ľudí na fotke.</span>
      </section>

      <section className="card" style={{ paddingTop: 4, paddingBottom: 4 }} aria-label="Vybavenie">
        {(items || []).map((it, idx) => (
          <div key={it.label} className="list-row">
            <span className="grow" style={{ fontSize: 15, fontWeight: 500 }}>
              {it.label}
            </span>
            <div className="seg" role="group" aria-label={it.label}>
              {OPTIONS.map(([val, text]) => (
                <button key={text} type="button" aria-pressed={it.vote === val} onClick={() => (val === null ? setItems(items.map((x, i) => (i === idx ? { ...x, vote: null } : x))) : setVote(idx, val))}>
                  {text}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {newItem === null ? (
        <button type="button" className="btn dashed" onClick={() => setNewItem('')}>
          + Pridať inú vec
        </button>
      ) : (
        <div className="row">
          <label htmlFor="new-item" className="sr-only">
            Názov veci
          </label>
          <input id="new-item" className="input grow" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="napr. Reproduktory" autoFocus onKeyDown={(e) => e.key === 'Enter' && addItem()} />
          <button type="button" className="btn small primary" onClick={addItem}>
            Pridať
          </button>
        </div>
      )}

      <div className="field">
        <label htmlFor="tip" style={{ fontSize: 15, color: 'var(--ink)' }}>
          Čo si sem priniesť alebo na čo myslieť
        </label>
        <input id="tip" className="input" value={tip} maxLength={MAX_TIP} onChange={(e) => setTip(e.target.value)} placeholder="napr. Predlžovačka, zásuvky sú len pri oknách" />
        <span className="small muted" style={{ alignSelf: 'flex-end' }}>
          {tip.length} / {MAX_TIP}
        </span>
      </div>

      <button type="button" className="btn primary block" onClick={save} disabled={saving}>
        {saving ? 'Ukladám…' : `Uložiť${changes ? ` (${changes})` : ''}`}
      </button>
    </main>
  )
}
