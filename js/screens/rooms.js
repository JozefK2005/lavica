import { api } from '../data/api.js'
import { readJSON, writeJSON } from '../lib/storage.js'
import { bottomNav, errorHtml, esc, icon, link, loadingHtml, plural, roomLink, toast } from '../ui.js'

const FILTER_KEY = 'ucebne:roomsBuilding'

export default function rooms(root) {
  let building = readJSON(FILTER_KEY, 'all')
  let data = null
  let error = null

  root.innerHTML = `
    <main class="screen">
      <h1>Učebne</h1>
      <div class="row" role="group" aria-label="Budova" id="building-chips" style="flex-wrap:wrap;gap:8px"></div>
      <div class="field">
        <label for="room-q" class="sr-only">Hľadať učebňu</label>
        <div style="position:relative">
          <span style="position:absolute;left:14px;top:14px;color:var(--muted)">${icon('search')}</span>
          <input id="room-q" class="input" style="padding-left:44px" placeholder="Číslo alebo názov učebne" inputmode="search">
        </div>
      </div>
      <div id="room-list" class="stack" style="gap:18px">${loadingHtml()}</div>
      <div class="stack" style="margin-top:8px">
        <a href="${link('/stitky')}" class="btn ghost block">${icon('print')} QR štítky na dvere</a>
        ${
          api.mode === 'demo'
            ? `<div class="card dashed stack">
                <span class="small muted">Demo režim: budovy a učebne sú skutočné, vybavenie, tipy a hlásenia sú len ukážkové a ukladajú sa v tomto prehliadači.</span>
                <button type="button" class="btn small ghost" data-action="reset">Obnoviť ukážkové dáta</button>
              </div>`
            : ''
        }
      </div>
    </main>
    ${bottomNav('ucebne')}`

  const chipsEl = root.querySelector('#building-chips')
  const listEl = root.querySelector('#room-list')
  const searchEl = root.querySelector('#room-q')

  function drawChips() {
    const chip = (code, label) => `<button type="button" class="chip" aria-pressed="${building === code}" data-action="building" data-code="${esc(code)}">${esc(label)}</button>`
    chipsEl.innerHTML = chip('all', 'Všetky') + (data?.buildings || []).map((b) => chip(b.code, b.name)).join('')
  }

  function drawList() {
    if (error) return (listEl.innerHTML = errorHtml(error))
    if (!data) return (listEl.innerHTML = loadingHtml())
    const q = searchEl.value.trim().toLowerCase()
    const visible = data.rooms.filter(
      (r) => (building === 'all' || r.building === building) && (!q || `${r.number} ${r.name || ''} ${r.buildingName} ${r.floor}`.toLowerCase().includes(q))
    )
    const groups = data.buildings
      .map((b) => ({ ...b, rooms: visible.filter((r) => r.building === b.code).sort((x, y) => x.number.localeCompare(y.number, 'sk', { numeric: true })) }))
      .filter((g) => g.rooms.length)

    if (!groups.length) {
      listEl.innerHTML = `<p class="muted">Učebňu „${esc(searchEl.value)}“ sme v tejto budove nenašli.</p>`
      return
    }
    listEl.innerHTML = groups
      .map(
        (g) => `
      <section class="stack" style="gap:10px" aria-labelledby="b-${esc(g.code)}">
        <div class="row between" style="align-items:baseline">
          <h2 id="b-${esc(g.code)}">${esc(g.name)}</h2>
          <span class="small muted">${g.rooms.length} ${plural(g.rooms.length, 'učebňa', 'učebne', 'učební')}</span>
        </div>
        ${g.rooms
          .map((r) => {
            const meta = [r.name ? r.floor : '', r.seats ? `${r.seats} miest` : '', !r.hasInfo ? 'zatiaľ bez info' : ''].filter(Boolean).join(' · ')
            return `
          <a href="${roomLink(r.id)}" class="card row" style="text-decoration:none;color:inherit">
            <span class="room-badge" style="min-width:56px;text-align:center;font-size:18px">${esc(r.number)}</span>
            <div class="grow stack" style="gap:2px">
              <b>${esc(r.name || r.floor)}</b>
              <span class="small muted">${esc(meta)}</span>
            </div>
            ${r.openProblems > 0 ? `<span class="status open">${r.openProblems} ${plural(r.openProblems, 'problém', 'problémy', 'problémov')}</span>` : ''}
            ${icon('next', { size: 18, color: 'var(--muted)' })}
          </a>`
          })
          .join('')}
      </section>`
      )
      .join('')
  }

  async function load() {
    error = null
    drawList()
    try {
      const [buildings, list] = await Promise.all([api.listBuildings(), api.listRooms()])
      data = { buildings, rooms: list }
    } catch (e) {
      error = e
    }
    drawChips()
    drawList()
  }

  root.oninput = (e) => {
    if (e.target === searchEl) drawList()
  }

  root.onclick = async (e) => {
    if (e.target.closest('[data-retry]')) return load()
    const btn = e.target.closest('[data-action]')
    if (!btn) return
    if (btn.dataset.action === 'building') {
      building = btn.dataset.code
      writeJSON(FILTER_KEY, building)
      drawChips()
      drawList()
    }
    if (btn.dataset.action === 'reset') {
      await api.resetDemo()
      await load()
      toast('Ukážkové dáta obnovené')
    }
  }

  drawChips()
  load()
}
