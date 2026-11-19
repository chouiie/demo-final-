import { SCENARIOS, SCEN, windowMean } from '../lib/data'

/** "Before you look": guess end-of-century summer length, then reveal vs CMIP6. */
export default function GuessCard({ place, cell, guess, setGuess, revealed, setRevealed }) {
  const base = cell.baseline.summer
  const g = guess ?? base
  const futures = SCENARIOS.map((s) => ({ ...s, v: Math.round(windowMean(cell, s.key, 'summer', 2081, 2100)) }))
  const hi = futures[2].v
  const diff = hi - g

  return (
    <section className="card guess">
      <p className="eyebrow">Before you look</p>
      <h3>In 1950–79, summer in {place.name} lasted about <b className="summer-text">{base} days</b>. Under high emissions, how long will it last by 2081–2100?</h3>
      <div className="guess-row">
        <input type="range" min={0} max={365} value={g} aria-label="Your guess, days of summer"
          onChange={(e) => { setGuess(+e.target.value); setRevealed(false) }} />
        <output className="guess-out">{g} d</output>
        {!revealed && <button className="btn" onClick={() => { setGuess(g); setRevealed(true) }}>Reveal</button>}
      </div>
      {revealed && (
        <div className="reveal" aria-live="polite">
          <p className="reveal-head">
            {Math.abs(diff) <= 10
              ? <>Spot on. Under {SCEN.ssp585.label}, summer stretches to <b>{hi} days</b>.</>
              : diff > 0
                ? <>The model goes further: <b>{hi} days</b> under {SCEN.ssp585.label}, {diff} more than you guessed.</>
                : <>You expected more: the model projects <b>{hi} days</b>, {-diff} fewer than your guess.</>}
          </p>
          {[{ key: 'base', label: '1950–79', v: base }, { key: 'guess', label: 'Your guess', v: g }, ...futures].map((d) => (
            <div className="rbar" key={d.key}>
              <span className="rbar-label">{d.label}{d.name && <small>{d.name}</small>}</span>
              <span className="rbar-track"><span className={`rbar-fill ${d.key}`} style={{ width: `${(d.v / 365) * 100}%` }} /></span>
              <span className="rbar-val">{d.v} d</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
