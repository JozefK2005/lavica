
import { clearErrorToast, go } from './ui.js'
import today from './screens/today.js'
import timetableEdit from './screens/timetable.js'
import rooms from './screens/rooms.js'
import room from './screens/room.js'
import addInfo from './screens/addinfo.js'
import report from './screens/report.js'
import scan from './screens/scan.js'
import labels from './screens/labels.js'

const ROUTES = [
  [/^\/$/, today],
  [/^\/rozvrh$/, timetableEdit],
  [/^\/ucebne$/, rooms],
  [/^\/u\/([^/]+)$/, room],
  [/^\/u\/([^/]+)\/doplnit$/, addInfo],
  [/^\/u\/([^/]+)\/nahlasit$/, report],
  [/^\/scan$/, scan],
  [/^\/stitky$/, labels]
]

const root = document.getElementById('app')
let cleanup = null

function render() {
  const path = location.hash.replace(/^#/, '') || '/'
  for (const [pattern, screen] of ROUTES) {
    const m = pattern.exec(path)
    if (!m) continue
    if (typeof cleanup === 'function') cleanup()
    cleanup = null
    clearErrorToast()
    root.innerHTML = ''
    root.onclick = root.onchange = root.oninput = root.onsubmit = root.onkeydown = null
    window.scrollTo(0, 0)
    const params = m.slice(1).map((p) => decodeURIComponent(p))
    cleanup = screen(root, ...params)
    return
  }
  go('/')
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-back]')) return
  if (history.length > 1) history.back()
  else go('/')
})

window.addEventListener('hashchange', render)
render()

if ('serviceWorker' in navigator && window.self === window.top) {
  navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('Service worker sa nepodarilo zaregistrovať', e))
}
