import * as d3 from 'd3'
import { BASELINE, HIST_END, SCENARIOS, SCEN, dateLabel } from '../lib/data'
import Quiz from './Quiz'
import LengthChart from './LengthChart'
import SeasonRibbon from './SeasonRibbon'
import YearWheel from './YearWheel'
import YourSeasons from './YourSeasons'

function around(cell, scenario, year, field) {
  const rows = cell.series[scenario].filter((d) => Math.abs(d.year - year) <= 5)
  return d3.mean(rows.filter((d) => d[field] != null), (d) => d[field])
}

/** Everything about one place. All views share scenario / year / hoverYear. */
export default function CityPanel({
  place, cell, scenario, setScenario, year, setYear, hoverYear, setHoverYear,
  playing, setPlaying, onClose,
  answers, setAnswer, quizStep, setQuizStep, quizState, finishQuiz, skipQuiz, retakeQuiz,
}) {
  const shown = hoverYear ?? year
  const b = cell?.baseline
  const stat = (field) => (cell ? around(cell, scenario, shown, field) : null)

  return (
    <aside className="panel" aria-label={`Climate seasons for ${place.name}`}>
      <div className="panel-head">
        <div>
          <p className="eyebrow">{place.country ?? 'Selected location'}</p>
          <h2>{place.name}</h2>
          {cell && (
            <p className="muted small">
              Model grid cell {Math.abs(cell.lat).toFixed(1)}°{cell.lat >= 0 ? 'N' : 'S'}, {Math.abs(cell.lon).toFixed(1)}°{cell.lon >= 0 ? 'E' : 'W'} (~300 km wide)
              · summer line {cell.hot}°C · winter line {cell.cold}°C
            </p>
          )}
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close and zoom out">✕</button>
      </div>

      {!cell ? (
        <div className="loading">Loading projections…</div>
      ) : (
        <>
          {quizState === 'asking' && (
            <Quiz place={place} answers={answers} setAnswer={setAnswer} step={quizStep} setStep={setQuizStep}
              onDone={finishQuiz} onSkip={skipQuiz} />
          )}
          {quizState === 'done' && (
            <YourSeasons place={place} cell={cell} answers={answers} scenario={scenario} year={year}
              hoverYear={hoverYear} setHoverYear={setHoverYear} setYear={setYear} setPlaying={setPlaying} onRetake={retakeQuiz} />
          )}
          {quizState === 'skipped' && (
            <button className="card retake" onClick={retakeQuiz}>
              <span className="eyebrow">Make it personal</span>
              <span>Answer 3 quick questions to see {place.name}’s seasons across your own lifetime →</span>
            </button>
          )}
          {quizState !== 'asking' && (<>

          <div className="controls sticky-controls">
            <div className="seg" role="radiogroup" aria-label="Emissions scenario">
              {SCENARIOS.map((s) => (
                <button key={s.key} role="radio" aria-checked={scenario === s.key}
                  className={scenario === s.key ? 'on' : ''} onClick={() => setScenario(s.key)}>
                  <i className={`sw ${s.key}`} />{s.label}<small>{quizState === 'done' && answers.future === s.key ? 'your pick' : s.short}</small>
                </button>
              ))}
            </div>
            <div className="year-ctl">
              <button className="icon-btn" aria-label={playing ? 'Pause' : 'Play through the years'}
                onClick={() => { if (!playing && year >= 2100) setYear(1950); setPlaying(!playing) }}>
                {playing ? '❚❚' : '▶'}
              </button>
              <input type="range" min={1950} max={2100} value={year} aria-label="Year"
                onChange={(e) => { setPlaying(false); setYear(+e.target.value) }} />
              <output className="year-out">{year}</output>
            </div>
          </div>

          <section className="card wheel-card">
            <YearWheel cell={cell} scenario={scenario} year={shown} size={270} />
            <div className="stats">
              <p className="eyebrow">Around {shown} {shown > HIST_END ? `· ${SCEN[scenario].label}` : ''}</p>
              <Stat label="Summer begins" now={stat('ss')} base={b.ss} early />
              <Stat label="Summer ends" now={stat('se')} base={b.se} />
              <Stat label="Winter begins" now={stat('ws')} base={b.ws} />
              <Stat label="Winter ends" now={stat('we')} base={b.we} early />
              <p className="muted small">Outer ring = typical {BASELINE[0]}–{BASELINE[1]} seasons. Inner ring = the selected year. 11-year averages in the list.</p>
            </div>
          </section>

          <section className="card">
            <LengthChart cell={cell} season="summer" scenario={scenario} year={year} hoverYear={hoverYear}
              onHover={setHoverYear} onSelect={(y) => { setPlaying(false); setYear(y) }} />
            <LengthChart cell={cell} season="winter" scenario={scenario} year={year} hoverYear={hoverYear}
              onHover={setHoverYear} onSelect={(y) => { setPlaying(false); setYear(y) }} />
            <LengthChart cell={cell} season="shoulder" scenario={scenario} year={year} hoverYear={hoverYear}
              onHover={setHoverYear} onSelect={(y) => { setPlaying(false); setYear(y) }} />
          </section>

          <section className="card">
            <h4 className="chart-title">Every year's seasons, 1950 → 2100</h4>
            <p className="muted small">Each row is one year. <span className="summer-text">Orange = summer</span>, <span className="winter-text">violet = winter</span>. Dashed lines mark the typical 1950–79 start and end dates. Hover a row for exact dates, click to jump to that year.</p>
            <SeasonRibbon cell={cell} scenario={scenario} year={year} hoverYear={hoverYear}
              onHover={setHoverYear} onSelect={(y) => { setPlaying(false); setYear(y) }} height={440} />
          </section>

          <p className="method muted small">
            Data: CMIP6 CanESM5 (r2i1p1f1) daily near-surface air temperature from the NOAA / Google Cloud public CMIP6 archive.
            Summer = the first-to-last day each year when the 7-day mean temperature is above the hottest-25% line of {BASELINE[0]}–{BASELINE[1]};
            winter is the same idea below the coldest-25% line. One model and one run, so this shows one plausible future, not the full range.
          </p>
          </>)}
        </>
      )}
    </aside>
  )
}

function Stat({ label, now, base, early }) {
  if (now == null || base == null || Number.isNaN(now)) {
    return (
      <div className="stat"><span>{label}</span><b>{now == null || Number.isNaN(now) ? 'never' : '—'}</b></div>
    )
  }
  const d = Math.round(now - base)
  const word = d === 0 ? 'no change' : `${Math.abs(d)} days ${d < 0 ? 'earlier' : 'later'}`
  return (
    <div className="stat">
      <span>{label}</span>
      <b>{dateLabel(Math.round(now))}</b>
      <em className={(early ? d < 0 : d > 0) ? 'up' : ''}>{word}</em>
    </div>
  )
}

