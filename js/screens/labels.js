// Obrazovka QR ŠTÍTKY (#/stitky): vygeneruje štítky na dvere učební na vytlačenie.
import { toDataURL } from '../../vendor/qrcode.js'
import { api } from '../data/api.js'
import { backButton, esc, icon, loadingHtml } from '../ui.js'

// odkaz v QR kóde – otvorí priamo detail učebne
export function roomUrl(id) {
  return `${location.origin}${location.pathname}#/u/${encodeURIComponent(id)}`
}

export default function labels(root) {
  let buildings = []
  let rooms = null
  let building = 'all'
  const codes = {}

  root.innerHTML = `
    <main class="screen no-nav">
      <div class="topbar no-print">${backButton('/ucebne')}</div>
      <div class="stack no-print" style="gap:8px">
        <h1 style="font-size:30px">QR štítky na dvere</h1>
        <p class="muted" style="margin:0;line-height:1.5">Každý kód otvorí detail učebne. Funguje aj obyčajným fotoaparátom v mobile, bez nainštalovanej appky.</p>
        <div class="row" role="group" aria-label="Budova" id="chips" style="flex-wrap:wrap;gap:8px"></div>
        <button type="button" class="btn primary block" data-action="print">${icon('print')} Vytlačiť</button>
      </div>
      <div class="labels" id="labels">${loadingHtml()}</div>
    </main>`

  function draw() {
    const chip = (code, label) => `<button type="button" class="chip" aria-pressed="${building === code}" data-action="building" data-code="${esc(code)}">${esc(label)}</button>`
    root.querySelector('#chips').innerHTML = chip('all', 'Všetky') + buildings.map((b) => chip(b.code, b.name)).join('')
    if (!rooms) return
    root.querySelector('#labels').innerHTML = rooms
      .filter((r) => building === 'all' || r.building === building)
      .map(
        (r) => `
        <div class="label-card">
          ${codes[r.id] ? `<img src="${codes[r.id]}" alt="QR kód učebne ${esc(r.number)}, ${esc(r.buildingName)}">` : '<span style="width:96px;height:96px"></span>'}
          <div class="stack" style="gap:4px">
            <span class="small muted" style="font-weight:600;letter-spacing:0.04em">${esc(r.buildingName.toUpperCase())}</span>
            <b>${esc(r.number)}</b>
            <span class="small muted">Naskenuj: čo tu je a nahlás problém</span>
          </div>
        </div>`
      )
      .join('')
  }

  root.onclick = (e) => {
    const btn = e.target.closest('[data-action]')
    if (!btn) return
    if (btn.dataset.action === 'print') window.print()
    if (btn.dataset.action === 'building') {
      building = btn.dataset.code
      draw()
    }
  }

  Promise.all([api.listBuildings(), api.listRooms()]).then(async ([b, r]) => {
    buildings = b
    rooms = r
    draw()
    const urls = await Promise.all(r.map((room) => toDataURL(roomUrl(room.id), { margin: 1, width: 240, color: { dark: '#232528', light: '#FFFFFF' } })))
    r.forEach((room, i) => (codes[room.id] = urls[i]))
    draw()
  })
}
