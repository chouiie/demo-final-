import * as d3 from 'd3'
import { HIST_END, SCENARIOS, SCEN, rolling } from '../lib/data'
import { useWidth } from '../lib/hooks'

const TITLES = {
  summer: '☀ Summer length (days)',
  winter: '❄ Winter length (days)',
  shoulder: '🍂 Spring + fall, the mild days in between (days)',
}

/**
 * Season length (days) per year, 1950–2100. Grey = shared history; one line per
 * scenario after 2014 (11-year running mean), faint dots = the selected scenario's
 * individual years. Crosshair is shared with the other views through hoverYear.
 */
export default function LengthChart({
  cell, season = 'summer', scenario, show = SCENARIOS.map((s) => s.key),
  year, hoverYear, onHover, onSelect, height = 240, title,
  domain = [1950, 2100], markers = [],
}) {
  const [ref, width] = useWidth()
  const m = { top: markers.length ? 44 : 28, right: 78, bottom: 26, left: 40 }
  const iw = width - m.left - m.right
  const ih = height - m.top - m.bottom
  if (!cell) return <div ref={ref} className="chart-empty" style={{ height }} />

  const [d0, d1] = domain
  const inDomain = (d) => d.year >= d0 && d.year <= d1
  const x = d3.scaleLinear().domain(domain).range([0, iw])
  const all = SCENARIOS.flatMap((s) => cell.series[s.key].filter(inDomain).map((d) => d[season]))
  const y = d3.scaleLinear().domain([0, Math.min(365, Math.max(60, d3.max(all) * 1.08))]).nice().range([ih, 0])
  const line = d3.line().x((d) => x(d.year)).y((d) => y(d.v)).curve(d3.curveMonotoneX)

  const smooth = Object.fromEntries(SCENARIOS.map((s) => [s.key, rolling(cell.series[s.key], season)]))
  const hist = smooth.ssp245.filter((d) => d.year <= HIST_END && inDomain(d))
  const base = cell.baseline[season]
  const hy = hoverYear ?? null

  // direct labels at the right edge, nudged apart so they never overlap
  const labels = show
    .map((k) => { const v = smooth[k].find((d) => d.year === d1).v; return { k, y: y(v), v } })
    .sort((a, b) => a.y - b.y)
  for (let i = 1; i < labels.length; i++) labels[i].y = Math.max(labels[i].y, labels[i - 1].y + 13)

  const pick = (ev) => {
    const [px] = d3.pointer(ev)
    return Math.max(d0, Math.min(d1, Math.round(x.invert(px))))
  }

  return (
    <div ref={ref} className="chart" style={{ position: 'relative' }}>
      <svg width={width} height={height} role="img" aria-label={`${season} length by year`}>
        <text x={m.left} y={14} className="chart-title">{title ?? TITLES[season]}</text>
        <g transform={`translate(${m.left},${m.top})`}>
          {y.ticks(4).map((t) => (
            <g key={t} transform={`translate(0,${y(t)})`}>
              <line x2={iw} className="grid" />
              <text x={-6} y={4} textAnchor="end" className="tick">{t}</text>
            </g>
          ))}
          {(markers.length ? markers.map((mk) => mk.year) : [1950, 1980, 2014, 2050, 2100]).map((t) => (
            <text key={t} x={x(t)} y={ih + 18} textAnchor="middle" className="tick">{t}</text>
          ))}
          {d1 > HIST_END && <rect x={x(Math.max(HIST_END, d0))} width={iw - x(Math.max(HIST_END, d0))} height={ih} className="proj-shade" />}
          <line x1={0} x2={iw} y1={y(base)} y2={y(base)} className="baseline-line" />
          <text x={4} y={y(base) - 4} className="tick muted">1950–79 avg {base} d</text>
          {scenario && (
            <g>
              {cell.series[scenario].filter((d) => d.year > HIST_END && inDomain(d)).map((d) => (
                <circle key={d.year} cx={x(d.year)} cy={y(d[season])} r={1.6} className={`dot ${scenario}`} />
              ))}
            </g>
          )}
          <path d={line(hist)} className="line hist" />
          {show.map((k) => (
            <path key={k} d={line(smooth[k].filter((d) => d.year >= Math.max(HIST_END, d0) && inDomain(d)))}
              className={`line ${k} ${scenario && k !== scenario ? 'dim' : ''}`} />
          ))}
          {labels.map((l) => (
            <text key={l.k} x={iw + 6} y={l.y + 4} className={`direct-label ${scenario && l.k !== scenario ? 'dim' : ''}`}>
              <tspan className={`key ${l.k}`}>●</tspan> {SCEN[l.k].label} {Math.round(l.v)}
            </text>
          ))}
          {markers.map((mk) => (
            <g key={mk.label} transform={`translate(${x(mk.year)},0)`}>
              <line y2={ih} className="marker-line" />
              <text y={-6} textAnchor={mk.year === d1 ? 'end' : mk.year === d0 ? 'start' : 'middle'} className="marker-label">{mk.label}</text>
            </g>
          ))}
          {year && year >= d0 && year <= d1 && <line x1={x(year)} x2={x(year)} y2={ih} className="year-line" />}
          {hy && <line x1={x(hy)} x2={x(hy)} y2={ih} className="crosshair" />}
          <rect width={iw} height={ih} fill="transparent" style={{ cursor: 'pointer' }}
            onMouseMove={(ev) => onHover?.(pick(ev))}
            onMouseLeave={() => onHover?.(null)}
            onClick={(ev) => onSelect?.(pick(ev))} />
        </g>
      </svg>
      {hy && (
        <div className="tooltip" style={{ top: m.top + 4, left: Math.min(m.left + x(hy) + 12, width - 190) }}>
          <strong>{hy}</strong>
          {hy <= HIST_END ? (
            <div>Historical · {cell.series.ssp245.find((d) => d.year === hy)[season]} days</div>
          ) : (
            show.map((k) => (
              <div key={k}><i className={`sw ${k}`} />{SCEN[k].label} · <b>{cell.series[k].find((d) => d.year === hy)[season]}</b> days</div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
