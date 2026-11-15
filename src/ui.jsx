import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'

const PATHS = {
  back: <path d="M15 5l-7 7 7 7" />,
  next: <path d="M9 5l7 7-7 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12l5 5 9-10" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  door: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M15 12h.01" />
    </>
  ),
  qr: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3M21 14v.01M14 21h.01M17 21h4v-4" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
    </>
  ),
  warn: (
    <>
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v5M12 18h.01" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  upload: <path d="M12 15V3M7 8l5-5 5 5M4 19h16" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  torch: <path d="M8 3h8l-1 6H9zM9 9l1 12h4l1-12" />,
  print: (
    <>
      <path d="M7 8V3h10v5" />
      <rect x="3" y="8" width="18" height="9" rx="2" />
      <path d="M7 14h10v7H7z" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  )
}

export function Icon({ name, size = 20, color = 'currentColor', stroke = 2, label }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : 'true'}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {PATHS[name]}
    </svg>
  )
}

export function BackButton({ to }) {
  const navigate = useNavigate()
  if (to) {
    return (
      <Link to={to} className="icon-btn" aria-label="Späť">
        <Icon name="back" />
      </Link>
    )
  }
  return (
    <button type="button" className="icon-btn" aria-label="Späť" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>
      <Icon name="back" />
    </button>
  )
}

export function BottomNav() {
  return (
    <nav className="nav-bar" aria-label="Hlavná navigácia">
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
        <Icon name="calendar" size={22} />
        Rozvrh
      </NavLink>
      <NavLink to="/scan" className="scan" aria-label="Skenovať QR kód učebne">
        <Icon name="qr" size={26} />
      </NavLink>
      <NavLink to="/ucebne" className={({ isActive }) => (isActive ? 'active' : '')}>
        <Icon name="door" size={22} />
        Učebne
      </NavLink>
    </nav>
  )
}

// --- Toast -----------------------------------------------------------------
const ToastCtx = createContext(() => {})

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef()
  const show = useCallback((text, kind = 'ok') => {
    setToast({ text, kind, key: Date.now() })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 2600)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  // chybová hláška patrí k obrazovke, kde vznikla – po prechode inam ju skryjeme
  const { pathname } = useLocation()
  useEffect(() => {
    setToast((t) => (t?.kind === 'error' ? null : t))
  }, [pathname])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div key={toast.key} className={`toast ${toast.kind === 'error' ? 'error' : ''}`} role="status">
          {toast.kind !== 'error' && <Icon name="check" color="var(--blue)" stroke={3} size={18} />}
          {toast.text}
        </div>
      )}
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)

// --- Načítanie dát ---------------------------------------------------------
export function useAsync(fn, deps) {
  const [state, setState] = useState({ loading: true, data: null, error: null })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    fn()
      .then((data) => alive && setState({ loading: false, data, error: null }))
      .catch((error) => alive && setState({ loading: false, data: null, error }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])
  return { ...state, reload: () => setTick((t) => t + 1) }
}

export function Loading({ text = 'Načítavam…' }) {
  return (
    <p className="muted" role="status">
      {text}
    </p>
  )
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="card warn stack" role="alert">
      <b>Niečo sa pokazilo</b>
      <span className="small">{String(error?.message || error)}</span>
      {onRetry && (
        <button type="button" className="btn small ghost" onClick={onRetry}>
          Skúsiť znova
        </button>
      )}
    </div>
  )
}
