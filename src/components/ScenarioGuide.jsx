import { useEffect, useRef, useState } from 'react'
import { FossilScene, GreenScene, MiddleScene } from './GuideScenes'

const GUIDE = [
  {
    key: 'ssp126',
    label: 'SSP1-2.6',
    name: 'Sustainability',
    nickname: '“Taking the Green Road”',
    story: 'A global shift toward sustainable practices, renewable energy, and lower inequality.',
    emissions: 'Emissions are cut severely, reaching net-zero around 2050–2075.',
    warming: 1.8,
    note: 'Stays below the 2°C Paris Agreement limit.',
    Scene: GreenScene,
  },
  {
    key: 'ssp245',
    label: 'SSP2-4.5',
    name: 'Middle of the Road',
    nickname: '',
    story: 'Historical social, economic, and technological trends continue without dramatic shifts.',
    emissions: 'Emissions hover near current levels before starting to fall around 2050, not reaching net-zero by 2100.',
    warming: 2.7,
    note: 'Moderate-to-high warming.',
    Scene: MiddleScene,
  },
  {
    key: 'ssp585',
    label: 'SSP5-8.5',
    name: 'Fossil-Fueled Development',
    nickname: '“Taking the Highway”',
    story: 'Rapid global economic growth heavily reliant on coal, oil, and gas.',
    emissions: 'Emissions roughly double by 2050 and continue rising rapidly.',
    warming: 4.4,
    note: 'Extreme, worst-case warming.',
    Scene: FossilScene,
  },
]

const AUTO_SECONDS = 7 // a page fills in on its own over this long; moving across it goes faster

/** Small round ⓘ button that opens the scenario guide. */
export function InfoButton({ onClick, label = 'What do the scenarios mean?' }) {
  return (
    <button className="info-btn" onClick={onClick} aria-label={label} title={label}>i</button>
  )
}

/**
 * The scenario guide: one illustrated page per scenario. Things related to that future
 * pop into the scene as you move across it (and fill in on their own if you don't).
 * Mounted only while open; closing unmounts it.
 */
export default function ScenarioGuide({ startAt = 0, onClose }) {
  const dialog = useRef(null)
  const sceneRef = useRef(null)
  const [page, setPage] = useState(Math.max(0, startAt))
  const [prog, setProg] = useState(0) // reveal progress of the current page, 0–1 (quantised)
  const [moved, setMoved] = useState(false)
  const progRef = useRef(0)

  useEffect(() => {
    const d = dialog.current
    if (d && !d.open) d.showModal()
  }, [])

  // auto-reveal; restarts whenever the page changes
  useEffect(() => {
    progRef.current = 0
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf
    let last = performance.now()
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now
      progRef.current = reduce ? 1 : Math.min(1, progRef.current + dt / AUTO_SECONDS)
      const q = Math.round(progRef.current * 50) / 50
      setProg((p) => (p === q ? p : q))
      if (progRef.current < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [page])

  // moving across the scene reveals things ahead of the auto-play, and shifts the layers
  const onMove = (ev) => {
    const el = sceneRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const fx = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width))
    el.style.setProperty('--px', (fx * 2 - 1).toFixed(3))
    if (!moved) setMoved(true)
    const target = Math.min(1, fx * 1.12)
    if (target > progRef.current) {
      progRef.current = target
      setProg(Math.round(target * 50) / 50)
    }
  }

  const go = (i) => {
    const n = (i + GUIDE.length) % GUIDE.length
    setPage(n)
    setProg(0)
  }

  // ← / → switch pages wherever focus is (clicking an arrow rebuilds the page and drops focus)
  const pageRef = useRef(page)
  useEffect(() => { pageRef.current = page }, [page])
  useEffect(() => {
    const onKey = (ev) => {
      if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return
      ev.preventDefault()
      const n = (pageRef.current + (ev.key === 'ArrowRight' ? 1 : -1) + GUIDE.length) % GUIDE.length
      setPage(n)
      setProg(0)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const g = GUIDE[page]
  const { Scene } = g

  return (
    <dialog ref={dialog} className={'guide ' + g.key} aria-labelledby="guide-title" onClose={onClose}
      onClick={(e) => { if (e.target === dialog.current) dialog.current.close() /* backdrop */ }}>
      <div className="guide-top">
        <div>
          <p className="eyebrow">Legend</p>
          <h2 id="guide-title">What do the scenarios mean?</h2>
        </div>
        <div className="guide-tabs" role="tablist" aria-label="Scenarios">
          {GUIDE.map((s, i) => (
            <button key={s.key} role="tab" aria-selected={i === page} className={i === page ? 'on' : ''} onClick={() => go(i)}>
              <i className={`sw ${s.key}`} />{s.label}
            </button>
          ))}
        </div>
        <button className="icon-btn" onClick={() => dialog.current.close()} aria-label="Close">✕</button>
      </div>

      <div className="guide-page" key={g.key}>
        <div className="guide-scene" ref={sceneRef} onPointerMove={onMove} onPointerDown={onMove}>
          <Scene prog={prog} />
          <button className="scene-arrow prev" onClick={() => go(page - 1)} aria-label="Previous scenario">‹</button>
          <button className="scene-arrow next" onClick={() => go(page + 1)} aria-label="Next scenario">›</button>
          {!moved && <span className="scene-hint">Move across the scene ↔</span>}
        </div>

        <div className="guide-card">
          <p className="guide-label"><span className={`sw ${g.key}`} aria-hidden />{g.label}</p>
          <h3>{g.name}</h3>
          {g.nickname && <p className="guide-nick">{g.nickname}</p>}
          <p className="guide-dt">Warming by 2100</p>
          <div className="meter" role="img" aria-label={`About ${g.warming} degrees Celsius of warming`}>
            <div className="meter-bar">
              <span className="meter-fill" style={{ '--v': `${(g.warming / 5) * 100}%` }} />
              <span className="meter-paris" style={{ left: '40%' }}><em>Paris limit 2°C</em></span>
            </div>
            <div className="meter-ticks"><span>0°</span><span>1°</span><span>2°</span><span>3°</span><span>4°</span><span>5°C</span></div>
          </div>
          <p className="guide-warmline"><span className="guide-warm">~{g.warming}°C</span> {g.note}</p>
        </div>
      </div>

      <div className="guide-details" key={g.key + '-d'}>
        <div><p className="guide-dt">The world</p><p>{g.story}</p></div>
        <div><p className="guide-dt">Emissions</p><p>{g.emissions}</p></div>
      </div>

      <p className="guide-foot muted small">
        Climate models are run for several possible futures, called Shared Socioeconomic Pathways (SSPs).
        Warming figures are the IPCC’s best estimates for 2081–2100 compared with 1850–1900. The model behind
        this site (CanESM5) runs warmer than most, so its season changes sit toward the high end.
      </p>
    </dialog>
  )
}
