import { api } from '../data/api.js'
import { backButton, errorHtml, esc, icon, loadingHtml, plural, roomLink, toast } from '../ui.js'

const CATEGORIES = ['Projektor', 'Zásuvky', 'Lavice, stoličky', 'Tabuľa, fixky', 'Kúrenie, okná', 'Wi-Fi', 'Iné']

export default function report(root, id) {
  let r = undefined
  let error = null
  let cat = null
  let text = ''
  let photo = null // { file, url }
  let joined = {} // { idProblému: true/false }
  let saving = false
  let done = null

  function sync() {
    const el = root.querySelector('#desc')
    if (el) text = el.value
  }

  const duplicates = () => (cat ? r.problems.filter((p) => p.status !== 'resolved' && p.category === cat && !p.mine) : [])

  function draw() {
    sync()
    if (error) return (root.innerHTML = `<main class="screen no-nav">${backButton()}${errorHtml(error)}</main>`)
    if (r === undefined) return (root.innerHTML = `<main class="screen no-nav">${backButton()}${loadingHtml()}</main>`)
    if (r === null) return (root.innerHTML = `<main class="screen no-nav">${backButton()}${errorHtml('Učebňa neexistuje')}</main>`)

    if (done) {
      root.innerHTML = `
        <main class="screen no-nav">
          <div class="success">
            <span class="badge">${icon('check', { size: 40, stroke: 2.6 })}</span>
            <h1>${done.joinedOnly ? 'Hlas započítaný' : 'Nahlásené'}</h1>
            ${
              done.joinedOnly
                ? ''
                : `<div class="card stack" style="width:100%;text-align:left;gap:4px">
                    <span class="small muted">Hlásenie č. ${esc(done.id)}</span>
                    <b>${esc(cat)}: ${esc(text.trim())}</b>
                    <span class="small muted">Učebňa ${esc(r.number)} · ${esc(r.buildingName)}</span>
                  </div>`
            }
            <p class="muted" style="margin:0;max-width:300px;line-height:1.5">Stav hlásenia uvidíš v detaile učebne. Keď to potvrdia ďalší, označíme ho ako vyriešené.</p>
            <a href="${roomLink(r.id)}" class="btn primary block">Späť na učebňu</a>
          </div>
        </main>`
      return
    }

    const dups = duplicates()
    root.innerHTML = `
      <main class="screen no-nav">
        <div class="topbar">${backButton()}<span class="muted" style="font-size:14px">Učebňa ${esc(r.number)} · ${esc(r.buildingShort)}</span></div>
        <h1 style="font-size:30px">Čo nefunguje?</h1>

        <div role="group" aria-label="Kategória problému" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
          ${CATEGORIES.map(
            (c) => `<button type="button" aria-pressed="${cat === c}" data-action="cat" data-cat="${esc(c)}"
              style="min-height:56px;border-radius:16px;border:${cat === c ? '2px solid var(--ink)' : '1px solid var(--line)'};background:${cat === c ? 'var(--blue)' : 'var(--card)'};font-weight:${cat === c ? 700 : 600};font-size:14px">${esc(c)}</button>`
          ).join('')}
        </div>

        ${
          dups.length
            ? `<section class="card warn stack" aria-label="Už nahlásené">
                <span class="small" style="font-weight:600;color:var(--warn-ink)">Toto už niekto nahlásil</span>
                ${dups
                  .map((p) => {
                    const on = joined[p.id] ?? p.mySame
                    const count = p.same + (on && !p.mySame ? 1 : 0) - (!on && p.mySame ? 1 : 0)
                    return `<div class="row between">
                      <div class="stack" style="gap:2px">
                        <b>${esc(p.text)}</b>
                        <span class="small" style="color:var(--warn-ink)">${count} ${plural(count, 'študent', 'študenti', 'študentov')}</span>
                      </div>
                      <button type="button" class="btn small" aria-pressed="${on}" data-action="join" data-id="${p.id}"
                        style="background:${on ? 'var(--card)' : 'var(--indigo)'};color:${on ? 'var(--ink)' : '#fff'};border:1px solid var(--indigo);white-space:nowrap">${on ? 'Pridané' : '+1 Aj mne'}</button>
                    </div>`
                  })
                  .join('')}
              </section>`
            : ''
        }

        <div class="field">
          <label for="desc" style="font-size:15px;color:var(--ink)">${dups.length ? 'Alebo popíš nový problém' : 'Popis problému'}</label>
          <textarea id="desc" class="input" maxlength="300" placeholder="Čo presne sa deje?">${esc(text)}</textarea>
        </div>

        ${
          photo
            ? `<div class="card row">
                <img src="${photo.url}" alt="Fotka k hláseniu" style="width:56px;height:56px;border-radius:10px;object-fit:cover">
                <span class="grow small">${esc(photo.file.name)}</span>
                <button type="button" class="icon-btn" aria-label="Odstrániť fotku" data-action="remove-photo">${icon('close', { size: 16 })}</button>
              </div>`
            : `<button type="button" class="btn dashed" data-action="add-photo">${icon('camera')} Pridať fotku</button>`
        }
        <input id="problem-photo" type="file" accept="image/*" capture="environment" class="sr-only" tabindex="-1" aria-hidden="true">

        <button type="button" class="btn primary block" data-action="submit" ${saving ? 'disabled' : ''}>${saving ? 'Odosielam…' : 'Odoslať hlásenie'}</button>
      </main>`
  }

  async function join(problemId) {
    const p = r.problems.find((x) => String(x.id) === String(problemId))
    const on = !(joined[p.id] ?? p.mySame)
    try {
      await api.setProblemVote(p.id, 'same', on)
      joined[p.id] = on
      draw()
      if (on) toast('Pridal si sa k existujúcemu hláseniu')
    } catch (e) {
      toast(e.message || 'Nepodarilo sa uložiť', 'error')
    }
  }

  async function submit() {
    sync()
    const anyJoined = Object.values(joined).some(Boolean)
    if (!cat) return toast('Vyber, čo nefunguje', 'error')
    if (!text.trim()) {
      if (anyJoined) {
        done = { joinedOnly: true }
        return draw()
      }
      return toast(duplicates().length ? 'Napíš popis alebo daj +1 existujúcemu hláseniu' : 'Napíš krátky popis', 'error')
    }
    saving = true
    draw()
    try {
      const pid = await api.addProblem(r.id, cat, text.trim(), photo?.file)
      done = { id: pid }
    } catch (e) {
      toast(e.message || 'Nepodarilo sa odoslať', 'error')
    }
    saving = false
    draw()
  }

  root.onclick = (e) => {
    const btn = e.target.closest('[data-action]')
    if (!btn) return
    const a = btn.dataset.action
    if (a === 'cat') {
      cat = cat === btn.dataset.cat ? null : btn.dataset.cat
      draw()
    }
    if (a === 'join') join(btn.dataset.id)
    if (a === 'add-photo') root.querySelector('#problem-photo').click()
    if (a === 'remove-photo') {
      URL.revokeObjectURL(photo.url)
      photo = null
      draw()
    }
    if (a === 'submit') submit()
  }

  root.onchange = (e) => {
    if (e.target.id !== 'problem-photo') return
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) {
      photo = { file: f, url: URL.createObjectURL(f) }
      draw()
    }
  }

  draw()
  api
    .getRoom(id)
    .then((data) => {
      r = data
      draw()
    })
    .catch((e) => {
      error = e
      draw()
    })

  return () => photo && URL.revokeObjectURL(photo.url)
}
