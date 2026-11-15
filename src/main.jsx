import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './styles.css'
import { ToastProvider } from './ui.jsx'
import Today from './screens/Today.jsx'
import TimetableEdit from './screens/TimetableEdit.jsx'
import Rooms from './screens/Rooms.jsx'
import Room from './screens/Room.jsx'
import AddInfo from './screens/AddInfo.jsx'
import Report from './screens/Report.jsx'
import Scan from './screens/Scan.jsx'
import Labels from './screens/Labels.jsx'

// Service worker = offline režim a inštalácia na plochu.
// Vo vloženom náhľade (iframe) ho nespúšťame – tam to prehliadač nedovolí.
if (window.self === window.top && 'serviceWorker' in navigator) {
  try {
    registerSW({ immediate: true })
  } catch (e) {
    console.warn('Service worker sa nepodarilo zaregistrovať', e)
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <ToastProvider>
        <div className="app">
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/rozvrh" element={<TimetableEdit />} />
            <Route path="/ucebne" element={<Rooms />} />
            <Route path="/u/:id" element={<Room />} />
            <Route path="/u/:id/doplnit" element={<AddInfo />} />
            <Route path="/u/:id/nahlasit" element={<Report />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/stitky" element={<Labels />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </ToastProvider>
    </HashRouter>
  </React.StrictMode>
)
