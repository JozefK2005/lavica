import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'
import { api } from '../data/api.js'
import { roomKey, roomLabel } from '../data/rooms.js'
import { readJSON, writeJSON } from '../lib/storage.js'
import { BackButton, Icon, useAsync, useToast } from '../ui.jsx'

// QR na dverách obsahuje odkaz …/#/u/108 – fotoaparát v mobile ho otvorí aj bez appky.
// Tu vieme prečítať odkaz aj samotné číslo učebne.
export function roomFromQr(text) {
  const t = String(text).trim()
  const m = /#\/u\/([^/?#]+)/.exec(t) || /[?&]ucebna=([^&#]+)/.exec(t)
  if (m) return decodeURIComponent(m[1]).toUpperCase()
  if (/^[A-Z0-9]{1,4}-[A-Za-z]?\d{1,4}[A-Za-z]?$/i.test(t)) return t.toUpperCase()
  return null
}

const RECENT_KEY = 'ucebne:recent'

export default function Scan() {
  const navigate = useNavigate()
  const toast = useToast()
  const videoRef = useRef()
  const canvasRef = useRef()
  const streamRef = useRef()
  const [state, setState] = useState('starting') // starting | scanning | denied | unsupported
  const [torch, setTorch] = useState(null) // null = nepodporované
  const [query, setQuery] = useState('')
  const [recent] = useState(() => readJSON(RECENT_KEY, []).filter((r) => String(r).includes('-')))
  const buildings = useAsync(() => api.listBuildings(), [])
  const [building, setBuilding] = useState(() => readJSON('ucebne:lastBuilding', null))
  const currentBuilding = building || buildings.data?.[0]?.code || ''

  async function openRoom(id) {
    const room = await api.getRoom(id)
    if (!room) {
      toast(`Učebňu ${roomLabel(id, buildings.data, 'name')} sme nenašli`, 'error')
      return false
    }
    writeJSON(RECENT_KEY, [id, ...recent.filter((r) => r !== id)].slice(0, 5))
    navigate(`/u/${encodeURIComponent(id)}`)
    return true
  }

  useEffect(() => {
    let raf = 0
    let stopped = false
    let lastBad = ''

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState('unsupported')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        video.srcObject = stream
        await video.play()
        const track = stream.getVideoTracks()[0]
        const caps = track.getCapabilities?.() || {}
        if (caps.torch) setTorch(false)
        setState('scanning')
        tick()
      } catch (e) {
        setState(e?.name === 'NotAllowedError' ? 'denied' : 'unsupported')
      }
    }

    function tick() {
      if (stopped) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas && video.readyState >= 2) {
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

    start()
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch }] })
      setTorch(!torch)
    } catch {
      setTorch(null)
    }
  }

  function search(e) {
    e.preventDefault()
    const number = query.trim()
    if (!number) return toast('Zadaj číslo učebne', 'error')
    openRoom(roomKey(currentBuilding, number))
  }

  const message = {
    starting: 'Zapínam kameru…',
    scanning: 'Namier na QR kód pri čísle na dverách',
    denied: 'Prístup ku kamere je zakázaný. Povoľ ho v nastaveniach prehliadača alebo zadaj číslo nižšie.',
    unsupported: 'Kamera tu nie je dostupná. Zadaj číslo učebne nižšie.'
  }[state]

  return (
    <main className="screen no-nav">
      <div className="topbar" style={{ justifyContent: 'space-between' }}>
        <BackButton to="/" />
        <b>Skenovať učebňu</b>
        {torch !== null ? (
          <button type="button" className="icon-btn" aria-label="Baterka" aria-pressed={torch} onClick={toggleTorch} style={torch ? { background: 'var(--blue)', borderColor: 'var(--blue)' } : undefined}>
            <Icon name="torch" />
          </button>
        ) : (
          <span style={{ width: 44 }} />
        )}
      </div>

      <div className="camera">
        <video ref={videoRef} playsInline muted aria-label="Náhľad kamery" />
        {state === 'scanning' && <div className="frame" aria-hidden="true" />}
        <p className="msg" role="status">
          {message}
        </p>
      </div>
      <canvas ref={canvasRef} hidden />

      <form className="stack" onSubmit={search}>
        <label htmlFor="room-id" style={{ fontWeight: 700 }}>
          Alebo vyber budovu a zadaj číslo učebne
        </label>
        <div className="row" role="group" aria-label="Budova" style={{ flexWrap: 'wrap', gap: 8 }}>
          {(buildings.data || []).map((b) => (
            <button key={b.code} type="button" className="chip" aria-pressed={currentBuilding === b.code} onClick={() => setBuilding(b.code)}>
              {b.name}
            </button>
          ))}
        </div>
        <div className="row">
          <input id="room-id" className="input grow" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="napr. 214" autoCapitalize="characters" />
          <button type="submit" className="btn small primary" style={{ minHeight: 48 }}>
            Hľadať
          </button>
        </div>
        {recent.length > 0 && (
          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
            <span className="small muted">Nedávne:</span>
            {recent.map((r) => (
              <button key={r} type="button" className="chip" onClick={() => openRoom(r)}>
                {roomLabel(r, buildings.data)}
              </button>
            ))}
          </div>
        )}
      </form>
    </main>
  )
}
