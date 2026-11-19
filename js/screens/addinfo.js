import { api } from '../data/api.js'
import { EQUIPMENT_PRESETS } from '../data/seed.js'
import { backButton, errorHtml, esc, icon, loadingHtml, plural, roomLink, toast } from '../ui.js'

const OPTIONS = [
  ['ano', 'Áno'],
  ['nie', 'Nie'],
  ['', '?']
]
const MAX_TIP = 80

export default function addInfo(root, id) {
  let r = undefined
  let error = null
  let items = [] // { id, key, label, vote, original }
  let photos = [] // { file, url }
  let tip = ''
  let addingItem = false
  let saving = false
  let done = null

  
  function sync() {
    const tipEl = root.querySelector('#tip')
    if (tipEl) tip = tipEl.value
  }

  const changes = () => items.filter((i) => i.vote !== i.original).length + photos.length + (tip.trim() ? 1 : 0)

  function draw() {
    sync()
    if (error) return (root.innerHTML = `<main class="screen no-nav">${backButton()}${errorHtml(error)}</main>`)
    if (r === undefined) return (root.innerHTML = `<main class="screen no-nav">${backButton()}${loadingHtml()}</main>`)
    if (r === null) return (root.innerHTML = `<main class="screen no-nav">${backButton()}${errorHtml('Učebňa neexistuje')}</main>`)

    if (done != null) {
      root.innerHTML = `
        <main class="screen no-nav">
          <div class="success">
            <span class="badge">${icon('check', { size: 40, stroke: 2.6 })}</span>
            <h1>Ďakujeme!</h1>
            <p class="muted" style="margin:0;max-width:300px;line-height:1.5">
              Pridal si ${done} ${plural(done, 'zmenu', 'zmeny', 'zmien')} k učebni ${esc(r.number)} (${esc(r.buildingShort)}). Uvidia ich všetci, ktorí tu majú hodinu.
            </p>
            <a href="${roomLink(r.id)}" class="btn primary block">Späť na učebňu</a>
          </div>
        </main>`
      return
    }

    const n = changes()
    root.innerHTML = `
      <main class="screen no-nav">
        <div class="topbar">${backButton()}<span class="muted" style="font-size:14px">Učebňa ${esc(r.number)} · ${esc(r.buildingShort)}</span></div>
        <h1 style="font-size:30px">Čo je v učebni?</h1>

        <section class="stack" aria-label="Fotky">
          <div class="thumbs">
            ${photos
              .map(
                (p, i) => `
              <div style="position:relative">
                <img src="${p.url}" alt="Nová fotka ${i + 1}" class="thumb">
                <button type="button" aria-label="Odstrániť fotku" data-action="remove-photo" data-i="${i}"
                  style="position:absolute;top:-8px;right:-8px;width:30px;height:30px;border-radius:15px;border:2px solid var(--bg);background:var(--ink);display:flex;align-items:center;justify-content:center;padding:0">
                  ${icon('close', { size: 12, color: '#fff', stroke: 3 })}
                </button>
              </div>`
              )
              .join('')}
            <button type="button" data-action="add-photo" class="${photos.length ? 'thumb' : 'card dashed'}"
              style="${photos.length ? 'border:1.5px dashed #A9C3D9;background:transparent' : 'width:100%;height:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px'}">
              <span style="width:40px;height:40px;border-radius:20px;background:var(--blue);display:inline-flex;align-items:center;justify-content:center">${icon('camera')}</span>
              ${photos.length ? '<span class="sr-only">Pridať ďalšiu fotku</span>' : '<b style="font-size:14px">Pridať fotky učebne</b>'}
            </button>
          </div>
          <input id="photo-file" type="file" accept="image/*" multiple class="sr-only" tabindex="-1" aria-hidden="true">
          <span class="small muted">Odfoť tabuľu, zásuvky a výhľad z lavíc. Prosím bez ľudí na fotke.</span>
        </section>

        <section class="card" style="padding-top:4px;padding-bottom:4px" aria-label="Vybavenie">
          ${items
            .map(
              (it, idx) => `
            <div class="list-row">
              <span class="grow" style="font-size:15px;font-weight:500">${esc(it.label)}</span>
              <div class="seg" role="group" aria-label="${esc(it.label)}">
                ${OPTIONS.map(([val, text]) => `<button type="button" aria-pressed="${(it.vote || '') === val}" data-action="vote" data-i="${idx}" data-val="${val}">${text}</button>`).join('')}
              </div>
            </div>`
            )
            .join('')}
        </section>

        ${
          addingItem
            ? `<div class="row">
                <label for="new-item" class="sr-only">Názov veci</label>
                <input id="new-item" class="input grow" placeholder="napr. Reproduktory">
                <button type="button" class="btn small primary" data-action="add-item">Pridať</button>
              </div>`
            : '<button type="button" class="btn dashed" data-action="open-item">+ Pridať inú vec</button>'
        }

        <div class="field">
          <label for="tip" style="font-size:15px;color:var(--ink)">Čo si sem priniesť alebo na čo myslieť</label>
          <input id="tip" class="input" maxlength="${MAX_TIP}" value="${esc(tip)}" placeholder="napr. Predlžovačka, zásuvky sú len pri oknách">
          <span class="small muted" id="tip-count" style="align-self:flex-end">${tip.length} / ${MAX_TIP}</span>
        </div>

        <button type="button" class="btn primary block" data-action="save" ${saving ? 'disabled' : ''}>${saving ? 'Ukladám…' : `Uložiť${n ? ` (${n})` : ''}`}</button>
      </main>`
  }

  function addItem() {
    const label = (root.querySelector('#new-item')?.value || '').trim()
    if (!label) return toast('Napíš, o akú vec ide', 'error')
    if (items.some((i) => i.label.toLowerCase() === label.toLowerCase())) return toast('Táto vec už v zozname je', 'error')
    items.push({ id: null, key: 'vlastne', label, vote: 'ano', original: null })
    addingItem = false
    draw()
  }

  async function save() {
    sync()
    const n = changes()
    if (!n) return toast('Najprv vyplň aspoň jednu vec', 'error')
    saving = true
    draw()
    try {
      for (const it of items.filter((i) => i.vote !== i.original)) {
        let eqId = it.id
        if (!eqId) {
          if (!it.vote) continue
          eqId = await api.addEquipment(r.id, it.label, it.key)
        }
        await api.voteEquipment(eqId, it.vote)
      }
      for (const p of photos) await api.addPhoto(r.id, p.file)
      if (tip.trim()) await api.addTip(r.id, tip.trim())
      done = n
    } catch (e) {
      toast(e.message || 'Nepodarilo sa uložiť', 'error')
    }
    saving = false
    draw()
  }

  root.onclick = (e) => {
    const btn = e.target.closest('[data-action]')
    if (!btn) return
    const a = btn.dataset.action
    if (a === 'add-photo') root.querySelector('#photo-file').click()
    if (a === 'remove-photo') {
      const [removed] = photos.splice(Number(btn.dataset.i), 1)
      URL.revokeObjectURL(removed.url)
      draw()
    }
    if (a === 'vote') {
      const it = items[Number(btn.dataset.i)]
      const val = btn.dataset.val || null
      it.vote = val && it.vote === val ? null : val
      draw()
    }
    if (a === 'open-item') {
      addingItem = true
      draw()
      root.querySelector('#new-item')?.focus()
    }
    if (a === 'add-item') addItem()
    if (a === 'save') save()
  }

  root.onkeydown = (e) => {
    if (e.target.id === 'new-item' && e.key === 'Enter') addItem()
  }

  root.oninput = (e) => {
    if (e.target.id === 'tip') {
      tip = e.target.value
      root.querySelector('#tip-count').textContent = `${tip.length} / ${MAX_TIP}`
      const n = changes()
      root.querySelector('[data-action="save"]').textContent = `Uložiť${n ? ` (${n})` : ''}`
    }
  }

  root.onchange = (e) => {
    if (e.target.id !== 'photo-file') return
    const files = [...(e.target.files || [])].filter((f) => f.type.startsWith('image/'))
    e.target.value = ''
    if (!files.length) return
    photos.push(...files.map((file) => ({ file, url: URL.createObjectURL(file) })))
    draw()
    toast(files.length === 1 ? 'Fotka pridaná' : `Pridaných ${files.length} fotiek`)
  }

  draw()
  api
    .getRoom(id)
    .then((data) => {
      r = data
      if (r) {
        items = r.equipment.map((e) => ({ id: e.id, key: e.key, label: e.label, vote: e.myVote, original: e.myVote }))
        for (const p of EQUIPMENT_PRESETS) {
          if (!items.some((i) => i.key === p.key)) items.push({ id: null, key: p.key, label: p.label, vote: null, original: null })
        }
      }
      draw()
    })
    .catch((e) => {
      error = e
      draw()
    })

  return () => photos.forEach((p) => URL.revokeObjectURL(p.url))
}
