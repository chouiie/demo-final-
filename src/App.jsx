import { useEffect, useState } from 'react'
import CityPanel from './components/CityPanel'
import CitySearch from './components/CitySearch'
import Globe from './components/Globe'
import { RAMPS, RAMP_MAX } from './lib/ramps'
import { SCENARIOS, loadCell, loadGrid, nearestCell } from './lib/data'
import { useWidth } from './lib/hooks'

const WINDOWS = [[2021, 2040], [2041, 2060], [2061, 2080], [2081, 2100]]
const windowFor = (y) => Math.max(0, WINDOWS.findIndex(([, b]) => y <= b))

export default function App() {
  const [grid, setGrid] = useState(null)
  const [place, setPlace] = useState(null)
  const [cell, setCell] = useState(null)
  const [scenario, setScenario] = useState('ssp585')
  const [metric, setMetric] = useState('summer')
  const [year, setYear] = useState(2090)
  const [hoverYear, setHoverYear] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [guess, setGuess] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [rootRef, width] = useWidth(1200)
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('theme') || 'dark' } catch { return 'dark' }
  })
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('theme', theme) } catch { /* storage unavailable */ }
  }, [theme])

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
    setGuess(null)
    setRevealed(false)
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
  const [a, m, z] = RAMPS[theme][metric]

  return (
    <div ref={rootRef} className={'app' + (place ? ' has-place' : '')} style={{ '--panel-w': `${panelW}px` }}>
      <div className="stars" aria-hidden />
      <Globe grid={grid} scenario={scenario} metric={metric} windowIdx={windowIdx}
        target={place} onPick={pickOnGlobe} shiftX={place && wide ? -panelW / 2 : 0} theme={theme} />

      <div className="topbar">
        <div className="brand">
          <span className="brand-dot" aria-hidden />Your Climate, Your Future
        </div>
        <CitySearch big value={place ? place.name : ''} onPick={choose} placeholder="Search your city…" />
        <button className="icon-btn theme-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? 'Switch to bright mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Bright mode' : 'Dark mode'}>
          {theme === 'dark' ? '☀' : '☾'}
        </button>
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
          playing={playing} setPlaying={setPlaying} guess={guess} setGuess={setGuess}
          revealed={revealed} setRevealed={setRevealed}
          onClose={() => { setPlace(null); setCell(null); setPlaying(false) }} />
      )}
    </div>
  )
}
