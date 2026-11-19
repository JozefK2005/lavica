import { api } from '../data/api.js'
import { RESOLVE_AFTER, STATUS_LABEL } from '../data/view.js'
import { ago, formatDate } from '../lib/dates.js'
import { backButton, bottomNav, errorHtml, esc, icon, link, loadingHtml, plural, roomLink, toast } from '../ui.js'

export default function room(root, id) {
  let r = undefined 
  let error = null
  let photo = 0
  let busy = false
  let showResolved = false

  async function load() {
    error = null
    try {
      r = await api.getRoom(id)
    } catch (e) {
      error = e
    }
    draw()
  }

  
  async function run(fn, msg) {
    if (busy) return
    busy = true
    draw() 
    try {
      await fn()
      if (msg) toast(msg)
      r = await api.getRoom(id)
    } catch (e) {
      toast(e.message || 'Nepodarilo sa uložiť', 'error')
    }
    busy = false
    draw()
  }

  function draw() {
    if (error) return (root.innerHTML = `<main class="screen">${backButton()}${errorHtml(error)}</main>`)
    if (r === undefined) return (root.innerHTML = `<main class="screen">${backButton()}${loadingHtml()}</main>`)
    if (r === null) {
      root.innerHTML = `
        <main class="screen">
          ${backButton()}
          <h1>Učebňu ${esc(id)} nepoznáme</h1>
          <p class="muted">Skontroluj číslo alebo ju vyhľadaj v zozname.</p>
          <a href="${link('/ucebne')}" class="btn primary block">Zoznam učební</a>
        </main>
        ${bottomNav()}`
      return
    }

    const photos = r.photos
    const current = photos.length ? photos[photo % photos.length] : null
    const open = r.problems.filter((p) => p.status !== 'resolved')
    const resolved = r.problems.filter((p) => p.status === 'resolved')
    const highlights = [...r.equipment].sort((a, b) => b.count - a.count).slice(0, 3)
    const subtitle = [r.buildingName, r.floor, r.seats ? `${r.seats} miest` : ''].filter(Boolean).join(' · ')

    root.innerHTML = `
      <div class="photo-hero">
        ${current ? `<img src="${esc(current.url)}" alt="Fotka učebne ${esc(r.number)}, ${esc(r.buildingName)}">` : `<div class="empty">${icon('camera', { size: 28 })}Zatiaľ žiadna fotka</div>`}
        <div style="position:absolute;top:16px;left:16px">${backButton()}</div>
        ${
          photos.length > 1
            ? `<button type="button" class="nav" style="left:12px" aria-label="Predchádzajúca fotka" data-action="prev">${icon('back')}</button>
               <button type="button" class="nav" style="right:12px" aria-label="Ďalšia fotka" data-action="next">${icon('next')}</button>`
            : ''
        }
        ${photos.length ? `<span class="count">${(photo % photos.length) + 1} / ${photos.length}</span>` : ''}
      </div>

      <main class="screen sheet">
        <div class="row between" style="align-items:flex-end">
          <div class="stack" style="gap:4px">
            <h1 style="font-size:44px">${esc(r.number)}</h1>
            ${r.name ? `<b style="font-size:16px">${esc(r.name)}</b>` : ''}
            <span class="muted" style="font-size:14px">${esc(subtitle)}</span>
          </div>
          ${r.updatedAt ? `<span class="small muted" style="text-align:right">Aktualizované<br>${ago(r.updatedAt)}</span>` : ''}
        </div>

        ${
          highlights.length
            ? `<div style="display:grid;grid-template-columns:repeat(${highlights.length},minmax(0,1fr));gap:8px">
            ${highlights
              .map((e) => {
                const broken = open.find((p) => e.label.toLowerCase().startsWith(p.category.toLowerCase().slice(0, 5)))
                const state = broken ? 'Nahlásený problém' : e.status === 'ano' ? 'Je tu' : e.status === 'nie' ? 'Nie je' : 'Neisté'
                return `<div class="card stack" style="padding:12px;gap:6px">
                  <b style="font-size:13px">${esc(e.label.split(' (')[0])}</b>
                  <span class="small" style="color:${broken ? 'var(--warn-strong)' : 'var(--muted)'};font-weight:${broken ? 600 : 400}">${state}</span>
                </div>`
              })
              .join('')}
          </div>`
            : ''
        }

        <section class="card accent stack" aria-labelledby="prep-title">
          <h2 id="prep-title" style="font-size:18px">Na čo sa pripraviť</h2>
          ${r.tips.length ? r.tips.slice(0, 5).map((t) => `<span style="font-size:15px;line-height:1.4">${esc(t.text)}</span>`).join('') : '<span style="font-size:15px">Zatiaľ žiadne tipy. Pridaj prvý.</span>'}
        </section>

        <section class="stack" aria-labelledby="eq-title">
          <div class="row between" style="align-items:baseline">
            <h2 id="eq-title">Vybavenie</h2>
            ${r.equipment.length ? '<span class="small muted">Sedí to? Potvrď.</span>' : ''}
          </div>
          ${
            r.equipment.length === 0
              ? `<div class="card dashed stack"><span>O vybavení tejto učebne zatiaľ nikto nič nepridal.</span><a href="${roomLink(r.id, '/doplnit')}" class="btn small primary">Buď prvý</a></div>`
              : `<div class="card" style="padding-top:4px;padding-bottom:4px">${r.equipment.map(equipmentRow).join('')}</div>`
          }
        </section>

        <section class="stack" aria-labelledby="pr-title">
          <div class="row between">
            <h2 id="pr-title">Problémy</h2>
            <a href="${roomLink(r.id, '/nahlasit')}" style="font-weight:600;font-size:14px;min-height:44px;display:flex;align-items:center">+ Nahlásiť</a>
          </div>
          ${open.length === 0 ? '<p class="muted small" style="margin:0">Momentálne tu nie je nahlásený žiadny problém.</p>' : ''}
          ${open.map(problemCard).join('')}
          ${
            resolved.length
              ? `<button type="button" class="btn small ghost" aria-expanded="${showResolved}" data-action="resolved">${showResolved ? 'Skryť vyriešené' : `Vyriešené (${resolved.length})`}</button>
                 ${
                   showResolved
                     ? resolved
                         .map(
                           (p) => `<div class="card row between">
                    <div class="stack" style="gap:2px">
                      <span style="font-weight:600;color:var(--muted)">${esc(p.text)}</span>
                      <span class="small muted">${p.resolvedAt ? `Opravené ${formatDate(new Date(p.resolvedAt))}` : 'Opravené'}</span>
                    </div>
                    <span class="status resolved">Vyriešené</span>
                  </div>`
                         )
                         .join('')
                     : ''
                 }`
              : ''
          }
        </section>

        <section class="stack" aria-labelledby="ph-title">
          <h2 id="ph-title">Fotky</h2>
          <div class="thumbs">
            ${photos
              .slice(0, 7)
              .map(
                (p, i) =>
                  `<button type="button" class="thumb" aria-pressed="${i === photo % photos.length}" aria-label="Zobraziť fotku ${i + 1}" data-action="photo" data-i="${i}" style="background-image:url('${esc(p.url)}');background-size:cover;background-position:center"></button>`
              )
              .join('')}
            <a href="${roomLink(r.id, '/doplnit')}" class="thumb" aria-label="Pridať fotku" style="border:1.5px dashed #A9C3D9;background:transparent;display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:24px;color:var(--ink)">+</a>
          </div>
        </section>

        <div class="row">
          <a href="${roomLink(r.id, '/doplnit')}" class="btn primary grow">Doplniť info</a>
          <a href="${roomLink(r.id, '/nahlasit')}" class="btn ghost grow">Nahlásiť problém</a>
        </div>
      </main>
      ${bottomNav()}`
  }

  function equipmentRow(e) {
    const mine = e.myVote === e.status
    const dot = e.status === 'ano' ? 'yes' : e.status === 'nie' ? 'no' : 'unknown'
    const count = `${e.count} ${plural(e.count, 'potvrdenie', 'potvrdenia', 'potvrdení')}${e.myVote ? ' · aj ty' : ''}${e.yes > 0 && e.no > 0 ? ` · ${Math.min(e.yes, e.no)} nesúhlasí` : ''}`
    return `
      <div class="list-row">
        <span class="dot ${dot}">${icon(e.status === 'ano' ? 'check' : 'close', { size: 14, stroke: 3, color: e.status === 'ano' ? 'var(--blue)' : 'var(--muted)' })}</span>
        <div class="grow stack" style="gap:1px">
          <span style="font-size:15px;font-weight:500;color:${e.status === 'nie' ? 'var(--muted)' : 'inherit'}">${e.status === 'nie' ? 'Bez: ' : ''}${esc(e.label)}</span>
          <span class="small muted">${count}</span>
        </div>
        ${
          e.status !== 'unknown'
            ? `<button type="button" class="btn small" style="min-height:44px;background:${mine ? 'var(--blue)' : 'var(--card)'};border:1px solid ${mine ? 'var(--blue)' : 'var(--line)'};color:var(--ink)" aria-pressed="${mine}" ${busy ? 'disabled' : ''} data-action="confirm" data-id="${esc(e.id)}">${mine ? 'Potvrdené' : 'Potvrdiť'}</button>`
            : ''
        }
      </div>`
  }

  function problemCard(p) {
    return `
      <div class="card warn stack">
        <div class="row between" style="align-items:flex-start">
          <b style="font-size:16px">${esc(p.text)}</b>
          <span class="status ${p.status}">${STATUS_LABEL[p.status]}</span>
        </div>
        <span class="small" style="color:var(--warn-ink)">
          ${esc(p.category)} · nahlásili ${p.same} ${plural(p.same, 'študent', 'študenti', 'študentov')} · od ${formatDate(new Date(p.createdAt))}${p.fixed > 0 ? ` · „funguje“ ${p.fixed}/${RESOLVE_AFTER}` : ''}
        </span>
        <div class="row" style="flex-wrap:wrap">
          ${
            p.mine
              ? '<span class="small" style="color:var(--warn-ink);font-weight:600">Toto si nahlásil ty</span>'
              : `<button type="button" class="btn small" style="background:${p.mySame ? 'var(--card)' : 'var(--indigo)'};color:${p.mySame ? 'var(--ink)' : '#fff'};border:1px solid var(--indigo)" aria-pressed="${p.mySame}" ${busy ? 'disabled' : ''} data-action="same" data-id="${p.id}">${p.mySame ? 'Aj tebe · zrušiť' : '+1 Aj mne'}</button>`
          }
          <button type="button" class="btn small" style="background:#FFF7E8;color:var(--warn-ink);border:1px solid #E8C48A" aria-pressed="${p.myFixed}" ${busy ? 'disabled' : ''} data-action="fixed" data-id="${p.id}">${p.myFixed ? 'Zrušiť „funguje“' : 'Už funguje'}</button>
        </div>
      </div>`
  }

  root.onclick = (e) => {
    if (e.target.closest('[data-retry]')) return load()
    const btn = e.target.closest('[data-action]')
    if (!btn) return
    const a = btn.dataset.action
    const n = r?.photos.length || 1
    if (a === 'prev') (photo = (photo - 1 + n) % n), draw()
    if (a === 'next') (photo = (photo + 1) % n), draw()
    if (a === 'photo') {
      photo = Number(btn.dataset.i)
      draw()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    if (a === 'resolved') (showResolved = !showResolved), draw()
    if (a === 'confirm') {
      const eq = r.equipment.find((x) => String(x.id) === btn.dataset.id)
      const mine = eq.myVote === eq.status
      run(() => api.voteEquipment(eq.id, mine ? null : eq.status), mine ? null : 'Ďakujeme, potvrdené')
    }
    if (a === 'same' || a === 'fixed') {
      const p = r.problems.find((x) => String(x.id) === btn.dataset.id)
      if (a === 'same') run(() => api.setProblemVote(p.id, 'same', !p.mySame), p.mySame ? null : 'Pridal si sa k hláseniu')
      else
        run(
          () => api.setProblemVote(p.id, 'fixed', !p.myFixed),
          p.myFixed ? null : p.fixed + 1 >= RESOLVE_AFTER ? 'Označené ako vyriešené' : `Ešte ${RESOLVE_AFTER - p.fixed - 1} potvrdenia a označíme to ako vyriešené`
        )
    }
  }

  draw()
  load()
}
