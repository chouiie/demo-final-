import { useCallback, useEffect, useState } from 'react'
import CityPanel from './components/CityPanel'
import CitySearch from './components/CitySearch'
import Globe from './components/Globe'
import Story from './components/Story'
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

  // a scrolling story first; scrolling past its end (or the button) dives into the globe
  const [view, setView] = useState('story')
  const explore = useCallback(() => setView('explore'), [])
  const backToStory = () => {
    setView('story')
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  }
  // the page only scrolls while the story is showing
  useEffect(() => {
    document.documentElement.classList.toggle('mode-explore', view === 'explore')
  }, [view])

  return (
    <>
    <Story active={view === 'story'} onExplore={explore} />
    <div className={'app-layer' + (view === 'explore' ? ' on' : '')}>
    <div ref={rootRef} id="explore" aria-hidden={view !== 'explore'} inert={view !== 'explore' ? true : undefined} className={'app' + (place ? ' has-place' : '')} style={{ '--panel-w': `${panelW}px` }}>
      <div className="stars" aria-hidden />
      <Globe grid={grid} scenario={scenario} metric={metric} windowIdx={windowIdx}
        target={place} onPick={pickOnGlobe} shiftX={wide ? (place ? -panelW / 2 : landingShift) : 0} paused={view !== 'explore'} />

      <div className="topbar">
        <button className="earth-btn" onClick={backToStory} aria-label="Back to the story" title="Back to the story">🌍</button>
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
    </>
  )
}
