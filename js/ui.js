// Spoločné pomôcky pre všetky obrazovky: escapovanie textu, ikony, navigácia, hlášky.

// Text od používateľov VŽDY vkladaj cez esc(), inak by niekto mohol do tipu vložiť HTML/JS.
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

// Odkaz na obrazovku, napr. link('/u/L9-P25') → '#/u/L9-P25'
export const link = (path) => '#' + path
export const roomLink = (id, sub = '') => link(`/u/${encodeURIComponent(id)}${sub}`)
export function go(path) {
  location.hash = path
}

const PATHS = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  door: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M15 12h.01"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M14 21h.01M17 21h4v-4"/>',
  bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5M4 19h16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  torch: '<path d="M8 3h8l-1 6H9zM9 9l1 12h4l1-12"/>',
  print: '<path d="M7 8V3h10v5"/><rect x="3" y="8" width="18" height="9" rx="2"/><path d="M7 14h10v7H7z"/>'
}

export function icon(name, { size = 20, color = 'currentColor', stroke = 2 } = {}) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || ''}</svg>`
}

// Tlačidlo späť: s cieľom je to odkaz, bez cieľa sa vráti v histórii (rieši app.js cez data-back)
export function backButton(path) {
  return path
    ? `<a href="${link(path)}" class="icon-btn" aria-label="Späť">${icon('back')}</a>`
    : `<button type="button" class="icon-btn" aria-label="Späť" data-back>${icon('back')}</button>`
}

export function bottomNav(active) {
  const cls = (name) => (active === name ? 'active' : '')
  return `
    <nav class="nav-bar" aria-label="Hlavná navigácia">
      <a href="#/" class="${cls('rozvrh')}" ${active === 'rozvrh' ? 'aria-current="page"' : ''}>${icon('calendar', { size: 22 })}Rozvrh</a>
      <a href="#/scan" class="scan" aria-label="Skenovať QR kód učebne">${icon('qr', { size: 26 })}</a>
      <a href="#/ucebne" class="${cls('ucebne')}" ${active === 'ucebne' ? 'aria-current="page"' : ''}>${icon('door', { size: 22 })}Učebne</a>
    </nav>`
}

export const loadingHtml = (text = 'Načítavam…') => `<p class="muted" role="status">${esc(text)}</p>`

export function errorHtml(error) {
  return `
    <div class="card warn stack" role="alert">
      <b>Niečo sa pokazilo</b>
      <span class="small">${esc(error?.message || error)}</span>
      <button type="button" class="btn small ghost" data-retry>Skúsiť znova</button>
    </div>`
}

// --- Hlášky (toast) ---------------------------------------------------------
let toastTimer
let toastEl
export function toast(text, kind = 'ok') {
  clearTimeout(toastTimer)
  toastEl?.remove()
  toastEl = document.createElement('div')
  toastEl.className = `toast ${kind === 'error' ? 'error' : ''}`
  toastEl.setAttribute('role', 'status')
  toastEl.dataset.kind = kind
  toastEl.innerHTML = `${kind === 'error' ? '' : icon('check', { color: 'var(--blue)', stroke: 3, size: 18 })}${esc(text)}`
  document.body.appendChild(toastEl)
  toastTimer = setTimeout(() => toastEl?.remove(), 2600)
}

// chybová hláška patrí k obrazovke, kde vznikla – pri prechode inam ju skryjeme
export function clearErrorToast() {
  if (toastEl?.dataset.kind === 'error') toastEl.remove()
}

export function plural(n, one, few, many) {
  if (n === 1) return one
  if (n >= 2 && n <= 4) return few
  return many
}
