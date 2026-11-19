import * as d3 from 'd3'

const BASE = import.meta.env.BASE_URL + 'data/'

export const SCENARIOS = [
  { key: 'ssp126', label: 'SSP1-2.6', name: 'Low emissions', short: 'Low' },
  { key: 'ssp245', label: 'SSP2-4.5', name: 'Middle of the road', short: 'Middle' },
  { key: 'ssp585', label: 'SSP5-8.5', name: 'High emissions', short: 'High' },
]
export const SCEN = Object.fromEntries(SCENARIOS.map((s) => [s.key, s]))
export const HIST_END = 2014
export const BASELINE = [1950, 1979]

let gridPromise
export function loadGrid() {
  gridPromise ??= fetch(BASE + 'grid.json').then((r) => r.json())
  return gridPromise
}

const cellCache = new Map()
export function loadCell(id) {
  if (!cellCache.has(id)) {
    cellCache.set(id, fetch(`${BASE}cells/${id}.json`).then((r) => r.json()).then(prepareCell))
  }
  return cellCache.get(id)
}

/** nearest land cell (great-circle-ish) to a lat/lon */
export function nearestCell(grid, lat, lon) {
  let best = null
  let bestD = Infinity
  const cl = Math.cos((lat * Math.PI) / 180)
  for (const c of grid.cells) {
    let dl = Math.abs(c.lon - lon)
    if (dl > 180) dl = 360 - dl
    const d = (c.lat - lat) ** 2 + (dl * cl) ** 2
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  return best
}

const len = (s, e) => (s == null ? 0 : e - s + 1)

/** Turn the compact per-cell JSON into per-scenario arrays of yearly rows. */
function prepareCell(raw) {
  const years = d3.range(raw.years[0], raw.years[1] + 1)
  const out = { ...raw, series: {} }
  for (const s of SCENARIOS) {
    const r = raw[s.key]
    out.series[s.key] = years.map((year, i) => ({
      year,
      ss: r.ss[i], se: r.se[i], summer: len(r.ss[i], r.se[i]), summerDays: r.sd[i],
      ws: r.ws[i], we: r.we[i], winter: len(r.ws[i], r.we[i]), winterDays: r.wd[i],
      t: r.t[i],
    }))
    // "spring + fall": the mild days that are neither summer nor winter
    for (const d of out.series[s.key]) d.shoulder = Math.max(0, 365 - d.summer - d.winter)
  }
  // the historical part is identical in every scenario; baseline = 1950-79
  const base = out.series.ssp245.filter((d) => d.year >= BASELINE[0] && d.year <= BASELINE[1])
  const med = (f) => {
    const v = base.map(f).filter((x) => x != null)
    return v.length ? Math.round(d3.median(v)) : null
  }
  out.baseline = {
    ss: med((d) => d.ss), se: med((d) => d.se), summer: Math.round(d3.mean(base, (d) => d.summer)),
    ws: med((d) => d.ws), we: med((d) => d.we), winter: Math.round(d3.mean(base, (d) => d.winter)),
    shoulder: Math.round(d3.mean(base, (d) => d.shoulder)),
    t: d3.mean(base, (d) => d.t),
  }
  return out
}

// ---- personalization ----
export const THIS_YEAR = 2026

export const SEASONS = {
  summer: { key: 'summer', label: 'Summer', icon: '☀', noun: 'summer' },
  winter: { key: 'winter', label: 'Winter', icon: '❄', noun: 'winter' },
  shoulder: { key: 'shoulder', label: 'Spring & fall', icon: '🍂', noun: 'spring and fall' },
}

export const QUESTIONS = [
  {
    key: 'season',
    q: 'Which season is yours?',
    hint: 'We’ll follow the season you care about most.',
    opts: [
      { value: 'summer', label: '☀ Summer', sub: 'Long, hot days' },
      { value: 'winter', label: '❄ Winter', sub: 'Cold, crisp, maybe snow' },
      { value: 'shoulder', label: '🍂 Spring & fall', sub: 'The mild days in between' },
    ],
  },
  {
    key: 'age',
    q: 'How old are you?',
    hint: 'So we can trace the seasons across your own lifetime.',
    opts: [
      { value: 2012, label: 'Under 18' },
      { value: 2004, label: '18–24' },
      { value: 1994, label: '25–39' },
      { value: 1976, label: '40–59' },
      { value: 1958, label: '60+' },
    ],
  },
  {
    key: 'future',
    q: 'Which future do you think we’re heading toward?',
    hint: 'Each answer matches a CMIP6 emissions scenario.',
    opts: [
      { value: 'ssp126', label: 'We cut emissions fast', sub: 'SSP1-2.6 · net zero around 2070' },
      { value: 'ssp245', label: 'Some progress, not enough', sub: 'SSP2-4.5 · emissions fall slowly after 2050' },
      { value: 'ssp585', label: 'Business as usual', sub: 'SSP5-8.5 · fossil fuel use keeps growing' },
    ],
  },
]

/** 11-year centred mean of a field around a year (smooths year-to-year noise) */
export function smoothAt(cell, scenario, field, year) {
  return windowMean(cell, scenario, field, year - 5, year + 5)
}

export function rowFor(cell, scenario, year) {
  return cell.series[scenario].find((d) => d.year === year)
}

/** mean of a field over a year window for one scenario */
export function windowMean(cell, scenario, field, y0, y1) {
  return d3.mean(cell.series[scenario].filter((d) => d.year >= y0 && d.year <= y1), (d) => d[field])
}

/** centred running mean, used to draw the trend line over noisy yearly values */
export function rolling(rows, field, w = 11) {
  const h = Math.floor(w / 2)
  return rows.map((d, i) => {
    const sl = rows.slice(Math.max(0, i - h), Math.min(rows.length, i + h + 1))
    return { year: d.year, v: d3.mean(sl, (x) => x[field]) }
  })
}

// ---- calendar helpers (model uses a 365-day "noleap" calendar) ----
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
export const MONTH_STARTS = MDAYS.reduce((a, d, i) => (a.push(i ? a[i - 1] + MDAYS[i - 1] : 0), a), [])
export { MONTHS }

/** day offset from Jan 1 (may be negative = previous year) → "Jun 14" */
export function dateLabel(off) {
  if (off == null) return '—'
  let d = ((off % 365) + 365) % 365
  let m = 0
  while (d >= MDAYS[m]) d -= MDAYS[m++]
  return `${MONTHS[m]} ${d + 1}`
}

export function seasonWindow(cell, scenario, y0, y1) {
  return {
    summer: Math.round(windowMean(cell, scenario, 'summer', y0, y1)),
    winter: Math.round(windowMean(cell, scenario, 'winter', y0, y1)),
  }
}

export const fmtSigned = (v, unit = '') => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(Math.round(v))}${unit}`
