
import jsQR from '../../vendor/jsqr.js'
import { api } from '../data/api.js'
import { roomKey, roomLabel } from '../data/rooms.js'
import { readJSON, writeJSON } from '../lib/storage.js'
import { backButton, esc, go, icon, toast } from '../ui.js'

const RECENT_KEY = 'ucebne:recent'

export function roomFromQr(text) {
  const t = String(text).trim()
  const m = /#\/u\/([^/?#]+)/.exec(t) || /[?&]ucebna=([^&#]+)/.exec(t)
  if (m) return decodeURIComponent(m[1]).toUpperCase()
  if (/^[A-Z0-9]{1,4}-[A-Za-z]{0,3}\d{1,4}[A-Za-z]?$/i.test(t)) return t.toUpperCase()
  return null
}

export default function scan(root) {
  let state = 'starting' // starting | scanning | denied | unsupported
  let torch = null // null = telefón baterku nepodporuje
  let stream = null
  let raf = 0
  let stopped = false
  let lastBad = ''
  let buildings = []
  let building = readJSON('ucebne:lastBuilding', null)
  const recent = readJSON(RECENT_KEY, []).filter((r) => String(r).includes('-'))

  root.innerHTML = `
    <main class="screen no-nav">
      <div class="topbar" style="justify-content:space-between">
        ${backButton('/')}
        <b>Skenovať učebňu</b>
        <span id="torch-slot" style="width:44px"></span>
      </div>
      <div class="camera">
        <video id="video" playsinline muted aria-label="Náhľad kamery"></video>
        <div class="frame" id="frame" aria-hidden="true" hidden></div>
        <p class="msg" role="status" id="msg">Zapínam kameru…</p>
      </div>
      <canvas id="canvas" hidden></canvas>
      <form class="stack" id="search-form" novalidate>
        <label for="room-id" style="font-weight:700">Alebo vyber budovu a zadaj číslo učebne</label>
        <div class="row" role="group" aria-label="Budova" id="building-chips" style="flex-wrap:wrap;gap:8px"></div>
        <div class="row">
          <input id="room-id" class="input grow" placeholder="napr. A534" autocapitalize="characters">
          <button type="submit" class="btn small primary" style="min-height:48px">Hľadať</button>
        </div>
        <div id="recent" class="row" style="flex-wrap:wrap;gap:6px"></div>
      </form>
    </main>`

  const video = root.querySelector('#video')
  const canvas = root.querySelector('#canvas')
  const msgEl = root.querySelector('#msg')

  function setState(s) {
    state = s
    msgEl.textContent = {
      starting: 'Zapínam kameru…',
      scanning: 'Namier na QR kód pri čísle na dverách',
      denied: 'Prístup ku kamere je zakázaný. Povoľ ho v nastaveniach prehliadača alebo zadaj číslo nižšie.',
      unsupported: 'Kamera tu nie je dostupná. Zadaj číslo učebne nižšie.'
    }[s]
    root.querySelector('#frame').hidden = s !== 'scanning'
  }

  function drawTorch() {
    root.querySelector('#torch-slot').outerHTML =
      torch === null
        ? '<span id="torch-slot" style="width:44px"></span>'
        : `<button type="button" id="torch-slot" class="icon-btn" aria-label="Baterka" aria-pressed="${torch}" data-action="torch" ${torch ? 'style="background:var(--blue);border-color:var(--blue)"' : ''}>${icon('torch')}</button>`
  }

  function drawChips() {
    const current = building || buildings[0]?.code || ''
    root.querySelector('#building-chips').innerHTML = buildings
      .map((b) => `<button type="button" class="chip" aria-pressed="${current === b.code}" data-action="building" data-code="${esc(b.code)}">${esc(b.name)}</button>`)
      .join('')
    root.querySelector('#recent').innerHTML = recent.length
      ? `<span class="small muted">Nedávne:</span>${recent.map((r) => `<button type="button" class="chip" data-action="recent" data-id="${esc(r)}">${esc(roomLabel(r, buildings))}</button>`).join('')}`
      : ''
  }

  async function openRoom(id) {
    const room = await api.getRoom(id)
    if (!room) {
      toast(`Učebňu ${roomLabel(id, buildings, 'name')} sme nenašli`, 'error')
      return false
    }
    writeJSON(RECENT_KEY, [id, ...recent.filter((r) => r !== id)].slice(0, 5))
    go(`/u/${encodeURIComponent(id)}`)
    return true
  }

  function tick() {
    if (stopped) return
    if (video.readyState >= 2) {
      const w = 480
      const h = Math.round((video.videoHeight / video.videoWidth) * w) || 640
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(video, 0, 0, w, h)
      const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })
      if (code?.data) {
        const id = roomFromQr(code.data)
        if (id) {
          stopped = true
          if (navigator.vibrate) navigator.vibrate(60)
          openRoom(id).then((ok) => {
            if (!ok) {
              stopped = false
              raf = requestAnimationFrame(tick)
            }
          })
          return
        }
        if (code.data !== lastBad) {
          lastBad = code.data
          toast('Tento QR kód nepatrí k učebni', 'error')
        }
      }
    }
    raf = requestAnimationFrame(tick)
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) return setState('unsupported')
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      if (stopped) return stream.getTracks().forEach((t) => t.stop())
      video.srcObject = stream
      await video.play()
      const caps = stream.getVideoTracks()[0].getCapabilities?.() || {}
      if (caps.torch) {
        torch = false
        drawTorch()
      }
      setState('scanning')
      tick()
    } catch (e) {
      setState(e?.name === 'NotAllowedError' ? 'denied' : 'unsupported')
    }
  }

  async function toggleTorch() {
    const track = stream?.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch }] })
      torch = !torch
    } catch {
      torch = null
    }
    drawTorch()
  }

  root.onclick = (e) => {
    const btn = e.target.closest('[data-action]')
    if (!btn) return
    const a = btn.dataset.action
    if (a === 'torch') toggleTorch()
    if (a === 'building') {
      building = btn.dataset.code
      drawChips()
    }
    if (a === 'recent') openRoom(btn.dataset.id)
  }

  root.onsubmit = (e) => {
    e.preventDefault()
    const number = root.querySelector('#room-id').value.trim()
    if (!number) return toast('Zadaj číslo učebne', 'error')
    openRoom(roomKey(building || buildings[0]?.code || '', number))
  }

  api.listBuildings().then((b) => {
    buildings = b
    drawChips()
  })
  startCamera()

  return () => {
    stopped = true
    cancelAnimationFrame(raf)
    stream?.getTracks().forEach((t) => t.stop())
  }
}
