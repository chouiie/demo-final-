import { HIST_END, SCENARIOS, SCEN, SEASONS, THIS_YEAR, smoothAt } from '../lib/data'
import LengthChart from './LengthChart'

/**
 * The personalised read-out: your season, across your lifetime, under the future
 * you expect — and what it looks like under the other two.
 */
export default function YourSeasons({ place, cell, answers, scenario, year, hoverYear, setHoverYear, setYear, setPlaying, onRetake }) {
  const season = SEASONS[answers.season]
  const born = answers.age
  const at80 = Math.min(2100, born + 80)
  const age80 = at80 - born
  const f = season.key
  const expected = answers.future

  const then = Math.round(smoothAt(cell, 'ssp245', f, Math.max(1955, born)))
  const now = Math.round(smoothAt(cell, expected, f, THIS_YEAR))
  const later = Math.round(smoothAt(cell, expected, f, at80))
  const diff = later - then
  const others = SCENARIOS.map((s) => ({ ...s, v: Math.round(smoothAt(cell, s.key, f, at80)) }))
  const spread = Math.max(...others.map((o) => o.v)) - Math.min(...others.map((o) => o.v))

  // the first year your season vanishes outright (if it does) in the future you expect
  const gone = cell.series[expected].find((d) => d.year > HIST_END && d[f] === 0)?.year

  const verb = diff > 0 ? 'grows' : 'shrinks'
  const mood =
    f === 'summer' ? (diff > 0 ? 'More of what you love, but every extra day is a day of heat that used to be rare.' : '')
      : diff < 0 ? 'The season you picked is the one climate change takes away.' : ''

  const markers = [
    { year: Math.max(1950, born), label: born < 1950 ? '1950' : 'born' },
    ...(THIS_YEAR > born + 3 ? [{ year: THIS_YEAR, label: 'today' }] : []),
    { year: at80, label: age80 >= 80 ? 'age 80' : `age ${age80}` },
  ]

  return (
    <section className="card you">
      <div className="quiz-top">
        <p className="eyebrow">Your {season.noun} in {place.name}</p>
        <button className="link-btn" onClick={onRetake}>Change answers</button>
      </div>

      <p className="you-head">
        When you were born (~{born}), {season.noun} here lasted about <b>{then} days</b>.
        By the time you are {age80}{at80 === 2100 && age80 < 80 ? ' (2100)' : ` in ${at80}`}, in the future you expect, it {verb} to <b className="you-big">{later} days</b>
        {' '}<span className={'you-delta ' + (diff > 0 ? 'up' : 'down')}>{diff > 0 ? '+' : '−'}{Math.abs(diff)}</span>.
      </p>
      {gone && <p className="you-alarm">{season.icon} Under {SCEN[expected].label}, the first year with <b>no {season.noun} at all</b> is {gone}, when you’d be {gone - born}.</p>}
      {mood && <p className="muted small">{mood}</p>}

      <LengthChart cell={cell} season={f} scenario={scenario} year={year} hoverYear={hoverYear}
        onHover={setHoverYear} onSelect={(y) => { setPlaying(false); setYear(y) }}
        domain={[Math.max(1950, born), at80]} markers={markers} height={230}
        title={`${season.icon} ${season.label} across your lifetime (days)`} />

      <p className="you-sub">At {age80 >= 80 ? '80' : age80}, which future you live in matters by <b>{spread} days</b>:</p>
      {[{ key: 'base', label: `Born ~${born}`, v: then }, { key: 'now', label: `Today (${THIS_YEAR})`, v: now }, ...others].map((d) => (
        <div className={'rbar' + (d.key === expected ? ' mine' : '')} key={d.key}>
          <span className="rbar-label">{d.label}{d.name && <small>{d.name}{d.key === expected ? ' · your pick' : ''}</small>}</span>
          <span className="rbar-track"><span className={`rbar-fill ${d.key}`} style={{ width: `${(d.v / 365) * 100}%` }} /></span>
          <span className="rbar-val">{d.v} d</span>
        </div>
      ))}
    </section>
  )
}
