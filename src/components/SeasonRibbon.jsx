import * as d3 from 'd3'
import { useState } from 'react'
import { HIST_END, MONTH_STARTS, MONTHS, SCEN, dateLabel } from '../lib/data'
import { useWidth } from '../lib/hooks'

/**
 * One row per year, 1950 at the top. Each row draws that year's summer span (orange)
 * and winter span (violet) on an 18-month axis (Jul of the previous year → Dec), so
 * both hemispheres' seasons fit without wrapping.
 */
export default function SeasonRibbon({
  cell, scenario, maxYear = 2100, year, hoverYear, onHover, onSelect, height = 420,
}) {
  const [ref, width] = useWidth()
  const [tip, setTip] = useState(null)
  const m = { top: 26, right: 12, bottom: 8, left: 44 }
  const iw = width - m.left - m.right
  const ih = height - m.top - m.bottom
  const x = d3.scaleLinear().domain([-184, 365]).range([0, iw])
  const y = d3.scaleLinear().domain([1950, 2101]).range([0, ih])
  const rh = Math.max(1, y(1951) - y(1950) - 0.6)
  if (!cell) return <div ref={ref} className="chart-empty" style={{ height }} />

  const rows = cell.series[scenario].filter((d) => d.year <= maxYear)
  const b = cell.baseline
  // Jul–Dec of the previous year, then Jan–Dec; thin to every other month when narrow
  const allTicks = [
    ...MONTH_STARTS.slice(6).map((d, i) => ({ t: d - 365, label: MONTHS[6 + i] })),
    ...MONTH_STARTS.map((d, i) => ({ t: d, label: MONTHS[i] })),
  ]
  const ticks = iw < 560 ? allTicks.filter((_, i) => i % 2 === 0) : allTicks

  const pick = (ev) => {
    const [, py] = d3.pointer(ev)
    const yr = Math.max(1950, Math.min(maxYear, Math.floor(y.invert(py))))
    const row = rows.find((d) => d.year === yr)
    onHover?.(yr)
    setTip(row ? { row, py } : null)
  }

  return (
    <div ref={ref} className="chart ribbon" style={{ position: 'relative' }}>
      <svg width={width} height={height} role="img" aria-label="Summer and winter dates for every year">
        <g transform={`translate(${m.left},${m.top})`}>
          {ticks.map(({ t, label }) => (
            <g key={t} transform={`translate(${x(t)},0)`}>
              <line y2={ih} className={t === 0 ? 'grid strong' : 'grid'} />
              <text y={-8} className="tick" textAnchor="start" dx={2}>{label}</text>
            </g>
          ))}
          <text x={x(-184)} y={-20} className="tick muted" dx={2}>← previous year</text>
          <text x={x(0)} y={-20} className="tick muted" dx={2}>new year →</text>
          {/* projection shading */}
          {maxYear > HIST_END && (
            <rect x={0} y={y(HIST_END + 1)} width={iw} height={y(Math.min(maxYear, 2100) + 1) - y(HIST_END + 1)} className="proj-shade" />
          )}
          {[1950, 1980, 2015, 2050, 2100].filter((v) => v <= maxYear).map((v) => (
            <text key={v} x={-6} y={y(v) + 4} className="tick" textAnchor="end">{v}</text>
          ))}
          {rows.map((d) => (
            <g key={d.year}>
              {d.ws != null && <rect x={x(d.ws)} width={Math.max(1, x(d.we + 1) - x(d.ws))} y={y(d.year)} height={rh} className="winter-bar" />}
              {d.ss != null && <rect x={x(d.ss)} width={Math.max(1, x(d.se + 1) - x(d.ss))} y={y(d.year)} height={rh} className="summer-bar" />}
            </g>
          ))}
          {/* baseline typical dates */}
          {[b.ss, b.se + 1, b.ws, b.we + 1].map((v, i) => v != null && !Number.isNaN(v) && (
            <line key={i} x1={x(v)} x2={x(v)} y1={0} y2={y(Math.min(maxYear, 2100) + 1)} className="baseline-line" />
          ))}
          {year && year <= maxYear && <rect x={-3} width={iw + 6} y={y(year) - 1} height={rh + 2} className="row-select" />}
          {hoverYear && hoverYear <= maxYear && <rect x={0} width={iw} y={y(hoverYear)} height={rh} className="row-hover" />}
          {maxYear > HIST_END && (
            <text x={iw - 4} y={y(HIST_END + 1) + 14} textAnchor="end" className="tick strong">
              {SCEN[scenario].label} · {SCEN[scenario].name}
            </text>
          )}
          <rect
            width={iw} height={ih} fill="transparent"
            onMouseMove={pick}
            onMouseLeave={() => { setTip(null); onHover?.(null) }}
            onClick={(ev) => { pick(ev); const [, py] = d3.pointer(ev); onSelect?.(Math.min(maxYear, Math.floor(y.invert(py)))) }}
            style={{ cursor: 'pointer' }}
          />
        </g>
      </svg>
      {tip && (
        <div className="tooltip" style={{ top: tip.py + m.top + 12, left: m.left + 8 }}>
          <strong>{tip.row.year}</strong>
          {tip.row.year > HIST_END && <span className="muted"> · {SCEN[scenario].label}</span>}
          <div><i className="sw summer" />Summer {dateLabel(tip.row.ss)} → {dateLabel(tip.row.se)} · <b>{tip.row.summer} days</b></div>
          <div><i className="sw winter" />Winter {dateLabel(tip.row.ws)} → {dateLabel(tip.row.we)} · <b>{tip.row.winter} days</b></div>
        </div>
      )}
    </div>
  )
}
