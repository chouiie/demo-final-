import { useEffect, useRef, useState } from 'react'
import CityPanel from './components/CityPanel'
import CitySearch from './components/CitySearch'
import Globe from './components/Globe'
import Opening from './components/Opening'
import { SLIDES } from './lib/slides'
import { RAMPS, RAMP_MAX } from './lib/ramps'
import { SCENARIOS, loadCell, loadGrid, nearestCell } from './lib/data'
import { useWidth } from './lib/hooks'

const WINDOWS = [[2021, 2040], [2041, 2060], [2061, 2080], [2081, 2100]]
const windowFor = (y) => Math.max(0, WINDOWS.findIndex(([, b]) => y <= b))

export default function App() {
  const [grid, setGrid] = useState(null)
  const [place, setPlace] = useState(null)
  const [cell, setCell] = useState(null)
  const saved = (() => { try { return JSON.parse(localStorage.getItem('answers')) || {} } catch { return {} } })()
  const [scenario, setScenario] = useState(saved.future ?? 'ssp585')
  const [metric, setMetric] = useState(saved.season === 'winter' ? 'winter' : 'summer')
  const [year, setYear] = useState(saved.age ? Math.min(2100, saved.age + 80) : 2090)
  const [hoverYear, setHoverYear] = useState(null)
  const [playing, setPlaying] = useState(false)
  // personalisation: 3 answers, remembered across cities and visits
  const [answers, setAnswers] = useState(saved)
  const complete = ['season', 'age', 'future'].every((k) => answers[k] != null)
  const [quizState, setQuizState] = useState(complete ? 'done' : 'asking')
  const [quizStep, setQuizStep] = useState(0)
  const setAnswer = (key, value) => {
    const next = { ...answers, [key]: value }
    setAnswers(next)
    try { localStorage.setItem('answers', JSON.stringify(next)) } catch { /* storage unavailable */ }
    if (key === 'future') setScenario(value)
    if (key === 'season') setMetric(value === 'winter' ? 'winter' : 'summer')
    if (key === 'age') setYear(Math.min(2100, value + 80))
  }
  const retakeQuiz = () => { setQuizStep(0); setQuizState('asking') }
  const [rootRef, width] = useWidth(1200)

  useEffect(() => { loadGrid().then(setGrid) }, [])

  // play through the years
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setYear((y) => {
      if (y >= 2100) { setPlaying(false); return 2100 }
      return y + 1
    }), 110)
    return () => clearInterval(id)
  }, [playing])

  const choose = async (p) => {
    if (!grid) return
    const c = nearestCell(grid, p.lat, p.lon)
    setPlace(p)
    setCell(null)
    setHoverYear(null)
    setCell(await loadCell(c.id))
  }

  const pickOnGlobe = ({ lat, lon }) => {
    const name = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`
    choose({ name, lat, lon })
  }

  const wide = width > 900
  const panelW = wide ? Math.min(560, width * 0.46) : 0
  const windowIdx = windowFor(hoverYear ?? year)
  // on the globe screen (no place yet) push the globe right until it clears the intro text
  const globeR = Math.min(width, typeof window !== 'undefined' ? window.innerHeight : 800) * 0.42
  const textRight = width < 1200 ? 340 : 440
  const landingShift = Math.max(0, Math.min(
    Math.max(width * 0.13, textRight + 28 - width / 2 + globeR), // clear the words
    width / 2 - globeR - 8, // but keep the globe on screen
  ))
  const [a, m, z] = RAMPS[metric]

  // intro slides (0..2) on the opening screen, then the globe slides in from the right
  const [view, setView] = useState('open')
  const [slide, setSlide] = useState(0)
  const nav = useRef({ view, slide })
  useEffect(() => { nav.current = { view, slide } }, [view, slide])

  useEffect(() => {
    const LAST = SLIDES.length - 1
    let lock = 0
    let lastWheel = 0
    const step = (dir) => {
      const now = performance.now()
      if (now < lock) return
      const { view: v, slide: sl } = nav.current
      if (v !== 'open') return
      if (dir > 0) {
        if (sl < LAST) setSlide(sl + 1)
        else setView('explore')
      } else if (sl > 0) setSlide(sl - 1)
      else return
      lock = now + 700
    }
    // wheel / trackpad: one gesture = one step (ignore the inertia tail of the same gesture)
    const onWheel = (ev) => {
      if (nav.current.view !== 'open') return
      ev.preventDefault()
      const now = performance.now()
      const fresh = now - lastWheel > 180
      lastWheel = now
      const d = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY
      if (!fresh || Math.abs(d) < 4) return
      step(d > 0 ? 1 : -1)
    }
    // touch: swipe left / up = next, swipe right / down = back
    let t0 = null
    const onTouchStart = (ev) => { t0 = nav.current.view === 'open' ? [ev.touches[0].clientX, ev.touches[0].clientY] : null }
    const onTouchEnd = (ev) => {
      if (!t0) return
      const dx = ev.changedTouches[0].clientX - t0[0]
      const dy = ev.changedTouches[0].clientY - t0[1]
      t0 = null
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) step(dx < 0 ? 1 : -1)
      else if (Math.abs(dy) > 60) step(dy < 0 ? 1 : -1)
    }
    const onKey = (ev) => {
      if (ev.target.closest?.('input, textarea') || nav.current.view !== 'open') return
      if (['ArrowRight', 'ArrowDown', 'Enter', ' ', 'PageDown'].includes(ev.key)) { ev.preventDefault(); step(1) }
      if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(ev.key)) { ev.preventDefault(); step(-1) }
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div className={'stage view-' + view}>
    <div className="track">
    <Opening slide={slide} setSlide={setSlide} onStart={() => setView('explore')} active={view === 'open'} />
    <div ref={rootRef} id="explore" aria-hidden={view !== 'explore'} inert={view !== 'explore' ? true : undefined} className={'app' + (place ? ' has-place' : '')} style={{ '--panel-w': `${panelW}px` }}>
      <div className="stars" aria-hidden />
      <Globe grid={grid} scenario={scenario} metric={metric} windowIdx={windowIdx}
        target={place} onPick={pickOnGlobe} shiftX={wide ? (place ? -panelW / 2 : landingShift) : 0} paused={view !== 'explore'} />

      <div className="topbar">
        <button className="brand" onClick={() => { setSlide(0); setView('open') }} title="Back to the start">
          <span className="brand-dot" aria-hidden />Your Climate, Your Future
        </button>
        <CitySearch big value={place ? place.name : ''} onPick={choose} placeholder="Search your city…" />
      </div>

      {!place && (
        <div className="intro">
          <p className="eyebrow">CMIP6 climate projections · 1950–2100</p>
          <h1>Not all climate change is equal.</h1>
          <p>Search your city, or click anywhere on Earth, to see how its summers and winters shift by 2100, and how much depends on our emissions.</p>
          {!grid && <p className="muted small">Loading global model grid…</p>}
        </div>
      )}

      <div className="globe-legend">
        <div className="seg small" role="radiogroup" aria-label="Map scenario">
          {SCENARIOS.map((s) => (
            <button key={s.key} role="radio" aria-checked={scenario === s.key}
              className={scenario === s.key ? 'on' : ''} onClick={() => setScenario(s.key)}>
              <i className={`sw ${s.key}`} />{s.label}
            </button>
          ))}
        </div>
        <div className="seg small" role="radiogroup" aria-label="Map layer">
          {[['summer', '☀ Summer gained'], ['winter', '❄ Winter lost']].map(([k, l]) => (
            <button key={k} role="radio" aria-checked={metric === k} className={metric === k ? 'on' : ''} onClick={() => setMetric(k)}>{l}</button>
          ))}
        </div>
        <div className="legend-line">
          <span>{metric === 'summer' ? 'Days of summer gained' : 'Days of winter lost'} · {WINDOWS[windowIdx].join('–')} vs 1950–79</span>
          <div className="legend-bar" style={{ background: `linear-gradient(90deg, ${a}, ${m}, ${z})` }} />
          <div className="legend-ticks"><span>0</span><span>{RAMP_MAX[metric] / 2}</span><span>{RAMP_MAX[metric]}+</span></div>
        </div>
        {!place && (
          <div className="year-ctl compact">
            <span className="muted small">Window</span>
            <input type="range" min={0} max={3} value={windowIdx} aria-label="Map time window"
              onChange={(e) => setYear(WINDOWS[+e.target.value][1] - 10)} />
          </div>
        )}
      </div>

      {place && (
        <CityPanel place={place} cell={cell} scenario={scenario} setScenario={setScenario}
          year={year} setYear={setYear} hoverYear={hoverYear} setHoverYear={setHoverYear}
          playing={playing} setPlaying={setPlaying}
          answers={answers} setAnswer={setAnswer} quizStep={quizStep} setQuizStep={setQuizStep}
          quizState={quizState} finishQuiz={() => setQuizState('done')} skipQuiz={() => setQuizState('skipped')} retakeQuiz={retakeQuiz}
          onClose={() => { setPlace(null); setCell(null); setPlaying(false) }} />
      )}
    </div>
    </div>
    </div>
  )
}
