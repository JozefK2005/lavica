import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../data/api.js'
import { RESOLVE_AFTER, STATUS_LABEL } from '../data/view.js'
import { ago, formatDate, plural } from '../lib/dates.js'
import { BackButton, BottomNav, ErrorBox, Icon, Loading, useAsync, useToast } from '../ui.jsx'

export default function Room() {
  const { id } = useParams()
  const toast = useToast()
  const room = useAsync(() => api.getRoom(id), [id])
  const [photo, setPhoto] = useState(0)
  const [busy, setBusy] = useState(false)
  const [showResolved, setShowResolved] = useState(false)

  async function run(fn, msg) {
    if (busy) return
    setBusy(true)
    try {
      await fn()
      if (msg) toast(msg)
      room.reload()
    } catch (e) {
      toast(e.message || 'Nepodarilo sa uložiť', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (room.loading && !room.data)
    return (
      <main className="screen">
        <BackButton />
        <Loading />
      </main>
    )
  if (room.error)
    return (
      <main className="screen">
        <BackButton />
        <ErrorBox error={room.error} onRetry={room.reload} />
      </main>
    )
  if (!room.data)
    return (
      <>
        <main className="screen">
          <BackButton />
          <h1>Učebňu {id} nepoznáme</h1>
          <p className="muted">Skontroluj číslo alebo ju vyhľadaj v zozname.</p>
          <Link to="/ucebne" className="btn primary block">
            Zoznam učební
          </Link>
        </main>
        <BottomNav />
      </>
    )

  const r = room.data
  const photos = r.photos
  const current = photos[photo % Math.max(photos.length, 1)]
  const open = r.problems.filter((p) => p.status !== 'resolved')
  const resolved = r.problems.filter((p) => p.status === 'resolved')
  const highlights = [...r.equipment].sort((a, b) => b.count - a.count).slice(0, 3)

  return (
    <>
      <div className="photo-hero">
        {current ? <img src={current.url} alt={`Fotka učebne ${r.number}, ${r.buildingName}`} /> : (
          <div className="empty">
            <Icon name="camera" size={28} />
            Zatiaľ žiadna fotka
          </div>
        )}
        <div style={{ position: 'absolute', top: 16, left: 16 }}>
          <BackButton />
        </div>
        {photos.length > 1 && (
          <>
            <button type="button" className="nav" style={{ left: 12 }} aria-label="Predchádzajúca fotka" onClick={() => setPhoto((photo - 1 + photos.length) % photos.length)}>
              <Icon name="back" />
            </button>
            <button type="button" className="nav" style={{ right: 12 }} aria-label="Ďalšia fotka" onClick={() => setPhoto((photo + 1) % photos.length)}>
              <Icon name="next" />
            </button>
          </>
        )}
        {photos.length > 0 && (
          <span className="count">
            {(photo % photos.length) + 1} / {photos.length}
          </span>
        )}
      </div>

      <main className="screen sheet">
        <div className="row between" style={{ alignItems: 'flex-end' }}>
          <div className="stack" style={{ gap: 4 }}>
            <h1 style={{ fontSize: 44 }}>{r.number}</h1>
            {r.name && <b style={{ fontSize: 16 }}>{r.name}</b>}
            <span className="muted" style={{ fontSize: 14 }}>
              {[r.buildingName, r.floor, r.seats ? `${r.seats} miest` : ''].filter(Boolean).join(' · ')}
            </span>
          </div>
          {r.updatedAt && (
            <span className="small muted" style={{ textAlign: 'right' }}>
              Aktualizované
              <br />
              {ago(r.updatedAt)}
            </span>
          )}
        </div>

        {highlights.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${highlights.length}, minmax(0,1fr))`, gap: 8 }}>
            {highlights.map((e) => {
              const broken = open.find((p) => e.label.toLowerCase().startsWith(p.category.toLowerCase().slice(0, 5)))
              return (
                <div key={e.id} className="card stack" style={{ padding: 12, gap: 6 }}>
                  <b style={{ fontSize: 13 }}>{e.label.split(' (')[0]}</b>
                  <span className="small" style={{ color: broken ? 'var(--warn-strong)' : 'var(--muted)', fontWeight: broken ? 600 : 400 }}>
                    {broken ? 'Nahlásený problém' : e.status === 'ano' ? 'Je tu' : e.status === 'nie' ? 'Nie je' : 'Neisté'}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        <section className="card accent stack" aria-labelledby="prep-title">
          <h2 id="prep-title" style={{ fontSize: 18 }}>
            Na čo sa pripraviť
          </h2>
          {r.tips.length ? (
            r.tips.slice(0, 5).map((t) => (
              <span key={t.id} style={{ fontSize: 15, lineHeight: 1.4 }}>
                {t.text}
              </span>
            ))
          ) : (
            <span style={{ fontSize: 15 }}>Zatiaľ žiadne tipy. Pridaj prvý.</span>
          )}
        </section>

        <section className="stack" aria-labelledby="eq-title">
          <div className="row between" style={{ alignItems: 'baseline' }}>
            <h2 id="eq-title">Vybavenie</h2>
            {r.equipment.length > 0 && <span className="small muted">Sedí to? Potvrď.</span>}
          </div>
          {r.equipment.length === 0 ? (
            <div className="card dashed stack">
              <span>O vybavení tejto učebne zatiaľ nikto nič nepridal.</span>
              <Link to={`/u/${encodeURIComponent(r.id)}/doplnit`} className="btn small primary">
                Buď prvý
              </Link>
            </div>
          ) : (
            <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
              {r.equipment.map((e) => {
                const mine = e.myVote === e.status
                return (
                  <div key={e.id} className="list-row">
                    <span className={`dot ${e.status === 'ano' ? 'yes' : e.status === 'nie' ? 'no' : 'unknown'}`}>
                      <Icon name={e.status === 'ano' ? 'check' : 'close'} size={14} stroke={3} color={e.status === 'ano' ? 'var(--blue)' : 'var(--muted)'} />
                    </span>
                    <div className="grow stack" style={{ gap: 1 }}>
                      <span style={{ fontSize: 15, fontWeight: 500, color: e.status === 'nie' ? 'var(--muted)' : 'inherit' }}>
                        {e.status === 'nie' ? `Bez: ${e.label}` : e.label}
                      </span>
                      <span className="small muted">
                        {e.count} {plural(e.count, 'potvrdenie', 'potvrdenia', 'potvrdení')}
                        {e.myVote ? ' · aj ty' : ''}
                        {e.yes > 0 && e.no > 0 ? ` · ${Math.min(e.yes, e.no)} nesúhlasí` : ''}
                      </span>
                    </div>
                    {e.status !== 'unknown' && (
                      <button
                        type="button"
                        className="btn small"
                        style={{ minHeight: 44, background: mine ? 'var(--blue)' : 'var(--card)', border: `1px solid ${mine ? 'var(--blue)' : 'var(--line)'}`, color: 'var(--ink)' }}
                        aria-pressed={mine}
                        disabled={busy}
                        onClick={() => run(() => api.voteEquipment(e.id, mine ? null : e.status), mine ? null : 'Ďakujeme, potvrdené')}
                      >
                        {mine ? 'Potvrdené' : 'Potvrdiť'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="stack" aria-labelledby="pr-title">
          <div className="row between">
            <h2 id="pr-title">Problémy</h2>
            <Link to={`/u/${encodeURIComponent(r.id)}/nahlasit`} style={{ fontWeight: 600, fontSize: 14, minHeight: 44, display: 'flex', alignItems: 'center' }}>
              + Nahlásiť
            </Link>
          </div>
          {open.length === 0 && <p className="muted small" style={{ margin: 0 }}>Momentálne tu nie je nahlásený žiadny problém.</p>}
          {open.map((p) => (
            <div key={p.id} className="card warn stack">
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <b style={{ fontSize: 16 }}>{p.text}</b>
                <span className={`status ${p.status}`}>{STATUS_LABEL[p.status]}</span>
              </div>
              <span className="small" style={{ color: 'var(--warn-ink)' }}>
                {p.category} · nahlásili {p.same} {plural(p.same, 'študent', 'študenti', 'študentov')} · od {formatDate(new Date(p.createdAt))}
                {p.fixed > 0 ? ` · „funguje“ ${p.fixed}/${RESOLVE_AFTER}` : ''}
              </span>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                {p.mine ? (
                  <span className="small" style={{ color: 'var(--warn-ink)', fontWeight: 600 }}>
                    Toto si nahlásil ty
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn small"
                    style={{ background: p.mySame ? 'var(--card)' : 'var(--indigo)', color: p.mySame ? 'var(--ink)' : '#fff', border: '1px solid var(--indigo)' }}
                    aria-pressed={p.mySame}
                    disabled={busy}
                    onClick={() => run(() => api.setProblemVote(p.id, 'same', !p.mySame), p.mySame ? null : 'Pridal si sa k hláseniu')}
                  >
                    {p.mySame ? 'Aj tebe · zrušiť' : '+1 Aj mne'}
                  </button>
                )}
                <button
                  type="button"
                  className="btn small"
                  style={{ background: '#FFF7E8', color: 'var(--warn-ink)', border: '1px solid #E8C48A' }}
                  aria-pressed={p.myFixed}
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => api.setProblemVote(p.id, 'fixed', !p.myFixed),
                      p.myFixed ? null : p.fixed + 1 >= RESOLVE_AFTER ? 'Označené ako vyriešené' : `Ešte ${RESOLVE_AFTER - p.fixed - 1} potvrdenia a označíme to ako vyriešené`
                    )
                  }
                >
                  {p.myFixed ? 'Zrušiť „funguje“' : 'Už funguje'}
                </button>
              </div>
            </div>
          ))}
          {resolved.length > 0 && (
            <>
              <button type="button" className="btn small ghost" aria-expanded={showResolved} onClick={() => setShowResolved(!showResolved)}>
                {showResolved ? 'Skryť vyriešené' : `Vyriešené (${resolved.length})`}
              </button>
              {showResolved &&
                resolved.map((p) => (
                  <div key={p.id} className="card row between">
                    <div className="stack" style={{ gap: 2 }}>
                      <span style={{ fontWeight: 600, color: 'var(--muted)' }}>{p.text}</span>
                      <span className="small muted">{p.resolvedAt ? `Opravené ${formatDate(new Date(p.resolvedAt))}` : 'Opravené'}</span>
                    </div>
                    <span className="status resolved">Vyriešené</span>
                  </div>
                ))}
            </>
          )}
        </section>

        <section className="stack" aria-labelledby="ph-title">
          <h2 id="ph-title">Fotky</h2>
          <div className="thumbs">
            {photos.slice(0, 7).map((p, i) => (
              <button key={p.id} type="button" className="thumb" aria-pressed={i === photo % photos.length} aria-label={`Zobraziť fotku ${i + 1}`} onClick={() => { setPhoto(i); window.scrollTo({ top: 0, behavior: 'smooth' }) }} style={{ backgroundImage: `url(${p.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            ))}
            <Link to={`/u/${encodeURIComponent(r.id)}/doplnit`} className="thumb" aria-label="Pridať fotku" style={{ border: '1.5px dashed #A9C3D9', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: 24, color: 'var(--ink)' }}>
              +
            </Link>
          </div>
        </section>

        <div className="row">
          <Link to={`/u/${encodeURIComponent(r.id)}/doplnit`} className="btn primary grow">
            Doplniť info
          </Link>
          <Link to={`/u/${encodeURIComponent(r.id)}/nahlasit`} className="btn ghost grow">
            Nahlásiť problém
          </Link>
        </div>
      </main>
      <BottomNav />
    </>
  )
}
