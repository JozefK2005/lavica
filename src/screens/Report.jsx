import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../data/api.js'
import { plural } from '../lib/dates.js'
import { BackButton, ErrorBox, Icon, Loading, useAsync, useToast } from '../ui.jsx'

const CATEGORIES = ['Projektor', 'Zásuvky', 'Lavice, stoličky', 'Tabuľa, fixky', 'Kúrenie, okná', 'Wi-Fi', 'Iné']

export default function Report() {
  const { id } = useParams()
  const toast = useToast()
  const room = useAsync(() => api.getRoom(id), [id])
  const [cat, setCat] = useState(null)
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState(null)
  const [joined, setJoined] = useState({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(null)
  const fileRef = useRef()

  useEffect(() => () => photo && URL.revokeObjectURL(photo.url), [photo])

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
  const duplicates = cat ? r.problems.filter((p) => p.status !== 'resolved' && p.category === cat && !p.mine) : []

  async function join(p) {
    const on = !(joined[p.id] ?? p.mySame)
    try {
      await api.setProblemVote(p.id, 'same', on)
      setJoined({ ...joined, [p.id]: on })
      if (on) toast('Pridal si sa k existujúcemu hláseniu')
    } catch (e) {
      toast(e.message || 'Nepodarilo sa uložiť', 'error')
    }
  }

  async function submit() {
    const anyJoined = Object.values(joined).some(Boolean)
    if (!cat) return toast('Vyber, čo nefunguje', 'error')
    if (!text.trim()) {
      if (anyJoined) return setDone({ joinedOnly: true })
      return toast(duplicates.length ? 'Napíš popis alebo daj +1 existujúcemu hláseniu' : 'Napíš krátky popis', 'error')
    }
    setSaving(true)
    try {
      const pid = await api.addProblem(r.id, cat, text.trim(), photo?.file)
      setDone({ id: pid })
    } catch (e) {
      toast(e.message || 'Nepodarilo sa odoslať', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <main className="screen no-nav">
        <div className="success">
          <span className="badge">
            <Icon name="check" size={40} stroke={2.6} />
          </span>
          <h1>{done.joinedOnly ? 'Hlas započítaný' : 'Nahlásené'}</h1>
          {!done.joinedOnly && (
            <div className="card stack" style={{ width: '100%', textAlign: 'left', gap: 4 }}>
              <span className="small muted">Hlásenie č. {done.id}</span>
              <b>
                {cat}: {text.trim()}
              </b>
              <span className="small muted">Učebňa {r.number} · {r.buildingName}</span>
            </div>
          )}
          <p className="muted" style={{ margin: 0, maxWidth: 300, lineHeight: 1.5 }}>
            Stav hlásenia uvidíš v detaile učebne. Keď to potvrdia ďalší, označíme ho ako vyriešené.
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
      <h1 style={{ fontSize: 30 }}>Čo nefunguje?</h1>

      <div role="group" aria-label="Kategória problému" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={cat === c}
            onClick={() => setCat(cat === c ? null : c)}
            style={{ minHeight: 56, borderRadius: 16, border: cat === c ? '2px solid var(--ink)' : '1px solid var(--line)', background: cat === c ? 'var(--blue)' : 'var(--card)', fontWeight: cat === c ? 700 : 600, fontSize: 14 }}
          >
            {c}
          </button>
        ))}
      </div>

      {duplicates.length > 0 && (
        <section className="card warn stack" aria-label="Už nahlásené">
          <span className="small" style={{ fontWeight: 600, color: 'var(--warn-ink)' }}>
            Toto už niekto nahlásil
          </span>
          {duplicates.map((p) => {
            const on = joined[p.id] ?? p.mySame
            return (
              <div key={p.id} className="row between">
                <div className="stack" style={{ gap: 2 }}>
                  <b>{p.text}</b>
                  <span className="small" style={{ color: 'var(--warn-ink)' }}>
                    {p.same + (on && !p.mySame ? 1 : 0) - (!on && p.mySame ? 1 : 0)} {plural(p.same, 'študent', 'študenti', 'študentov')}
                  </span>
                </div>
                <button type="button" className="btn small" aria-pressed={on} onClick={() => join(p)} style={{ background: on ? 'var(--card)' : 'var(--indigo)', color: on ? 'var(--ink)' : '#fff', border: '1px solid var(--indigo)', whiteSpace: 'nowrap' }}>
                  {on ? 'Pridané' : '+1 Aj mne'}
                </button>
              </div>
            )
          })}
        </section>
      )}

      <div className="field">
        <label htmlFor="desc" style={{ fontSize: 15, color: 'var(--ink)' }}>
          {duplicates.length ? 'Alebo popíš nový problém' : 'Popis problému'}
        </label>
        <textarea id="desc" className="input" value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder="Čo presne sa deje?" />
      </div>

      {photo ? (
        <div className="card row">
          <img src={photo.url} alt="Fotka k hláseniu" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover' }} />
          <span className="grow small">{photo.file.name}</span>
          <button type="button" className="icon-btn" aria-label="Odstrániť fotku" onClick={() => setPhoto(null)}>
            <Icon name="close" size={16} />
          </button>
        </div>
      ) : (
        <button type="button" className="btn dashed" onClick={() => fileRef.current?.click()}>
          <Icon name="camera" /> Pridať fotku
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) setPhoto({ file: f, url: URL.createObjectURL(f) })
        }}
      />

      <button type="button" className="btn primary block" onClick={submit} disabled={saving}>
        {saving ? 'Odosielam…' : 'Odoslať hlásenie'}
      </button>
    </main>
  )
}
