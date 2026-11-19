import * as d3 from 'd3'
import { BASELINE, HIST_END, MONTH_STARTS, MONTHS, SCEN, dateLabel, fmtSigned, rowFor } from '../lib/data'

/** A year as a clock: outer ring = typical 1950–79 seasons, inner ring = the chosen year. */
export default function YearWheel({ cell, scenario, year, size = 300 }) {
  const r = size / 2
  const ang = (off) => (off / 365) * 2 * Math.PI
  const arc = d3.arc().cornerRadius(3)
  if (!cell) return <div className="chart-empty" style={{ width: size, height: size }} />
  const row = rowFor(cell, scenario, year)
  const b = cell.baseline
  const ring = (s, e, inner, outer, cls, key) =>
    s != null && (
      <path key={key} className={cls}
        d={arc({ innerRadius: inner, outerRadius: outer, startAngle: ang(s), endAngle: ang(Math.min(e + 1, s + 365)) })} />
    )
  const ro = [r - 34, r - 22]
  const ri = [r - 76, r - 40]
  const dS = row.summer - b.summer
  const dW = row.winter - b.winter

  return (
    <svg width={size} height={size} className="wheel" role="img"
      aria-label={`Seasons in ${year}: summer ${row.summer} days, winter ${row.winter} days`}>
      <g transform={`translate(${r},${r})`}>
        <circle r={ro[1]} className="wheel-track" />
        <circle r={(ri[0] + ri[1]) / 2} className="wheel-track" strokeWidth={ri[1] - ri[0]} fill="none" />
        {MONTH_STARTS.map((s, i) => {
          const a = ang(s) - Math.PI / 2
          const am = ang(s + 15) - Math.PI / 2
          return (
            <g key={i}>
              <line x1={Math.cos(a) * (ri[0] - 2)} y1={Math.sin(a) * (ri[0] - 2)} x2={Math.cos(a) * (ro[1] + 2)} y2={Math.sin(a) * (ro[1] + 2)} className="grid" />
              <text x={Math.cos(am) * (r - 10)} y={Math.sin(am) * (r - 10) + 4} textAnchor="middle" className="tick">{MONTHS[i][0]}</text>
            </g>
          )
        })}
        {ring(b.ws, b.we, ro[0], ro[1], 'winter-arc faded', 'bw')}
        {ring(b.ss, b.se, ro[0], ro[1], 'summer-arc faded', 'bs')}
        {ring(row.ws, row.we, ri[0], ri[1], 'winter-arc', 'w')}
        {ring(row.ss, row.se, ri[0], ri[1], 'summer-arc', 's')}
        <text y={-30} textAnchor="middle" className="wheel-year">{year}</text>
        <text y={-12} textAnchor="middle" className="tick muted">
          {year > HIST_END ? SCEN[scenario].label : 'historical'}
        </text>
        <text y={12} textAnchor="middle" className="wheel-stat summer-text">
          ☀ {row.summer} d <tspan className="delta">{fmtSigned(dS)}</tspan>
        </text>
        <text y={32} textAnchor="middle" className="wheel-stat winter-text">
          ❄ {row.winter} d <tspan className="delta">{fmtSigned(dW)}</tspan>
        </text>
        <text y={50} textAnchor="middle" className="tick muted">vs {BASELINE[0]}–{BASELINE[1]}</text>
      </g>
      <title>{`Summer ${dateLabel(row.ss)}–${dateLabel(row.se)}, winter ${dateLabel(row.ws)}–${dateLabel(row.we)}`}</title>
    </svg>
  )
}
