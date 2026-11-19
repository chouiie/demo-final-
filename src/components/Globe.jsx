import * as d3 from 'd3'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { feature, mesh } from 'topojson-client'
import world from 'world-atlas/countries-110m.json'
import { CITIES } from '../lib/cities'
import { nearestCell } from '../lib/data'
import { GLOBE_THEME, RAMPS, RAMP_MAX } from '../lib/ramps'

const land = feature(world, world.objects.land)
const borders = mesh(world, world.objects.countries, (a, b) => a !== b)
const graticule = d3.geoGraticule10()


const ZOOM_IN = 3.6

/**
 * Orthographic Earth on canvas. Land grid cells are coloured by days of summer gained
 * (or winter lost) for the chosen scenario + 20-year window. Drag to spin, scroll to
 * zoom, click to pick a place. When `target` changes the globe flies to it.
 */
export default function Globe({ grid, scenario, metric, windowIdx, target, onPick, shiftX = 0, theme = 'dark' }) {
  const wrap = useRef(null)
  const canvas = useRef(null)
  const st = useRef({ rot: [20, -15, 0], k: 1, w: 800, h: 600, drag: null, anim: null, idle: true, hover: null })
  const drawRef = useRef(() => {})

  const cells = useMemo(() => {
    if (!grid) return []
    const hy = grid.dlat / 2
    const hx = grid.dlon / 2
    return grid.cells.map((c) => {
      const [w, e, s, n] = [c.lon - hx, c.lon + hx, Math.max(-89.9, c.lat - hy), Math.min(89.9, c.lat + hy)]
      return { type: 'Polygon', coordinates: [[[w, s], [w, n], [e, n], [e, s], [w, s]]] }
    })
  }, [grid])

  const colors = useMemo(() => {
    if (!grid) return []
    const base = grid.summary.baseline[metric]
    const fut = grid.summary[scenario][metric][windowIdx]
    const [a, m, z] = RAMPS[theme][metric]
    const max = RAMP_MAX[metric]
    const sc = d3.scaleLinear().domain([0, max / 2, max]).range([a, m, z]).interpolate(d3.interpolateLab).clamp(true)
    return base.map((b, i) => sc(Math.max(0, metric === 'summer' ? fut[i] - b : b - fut[i])))
  }, [grid, scenario, metric, windowIdx, theme])

  // ---------- drawing (refreshed after every render so it sees current props) ----------
  useLayoutEffect(() => {
  drawRef.current = () => {
    const cv = canvas.current
    if (!cv) return
    const s = st.current
    const P = GLOBE_THEME[theme]
    const dpr = window.devicePixelRatio || 1
    const ctx = cv.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, s.w, s.h)
    const r0 = Math.min(s.w, s.h) * 0.42
    const cx = s.w / 2 + s.shift
    const proj = d3.geoOrthographic().rotate(s.rot).scale(r0 * s.k).translate([cx, s.h / 2]).clipAngle(90).precision(0.6)
    const path = d3.geoPath(proj, ctx)
    const R = r0 * s.k

    // atmosphere glow
    const g = ctx.createRadialGradient(cx, s.h / 2, R * 0.92, cx, s.h / 2, R * 1.22)
    g.addColorStop(0, P.glow[0])
    g.addColorStop(1, P.glow[1])
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(cx, s.h / 2, R * 1.22, 0, 2 * Math.PI); ctx.fill()

    // ocean with a soft terminator shading
    const og = ctx.createRadialGradient(cx - R * 0.35, s.h / 2 - R * 0.35, R * 0.1, cx, s.h / 2, R)
    og.addColorStop(0, P.ocean[0])
    og.addColorStop(1, P.ocean[1])
    ctx.fillStyle = og
    ctx.beginPath(); path({ type: 'Sphere' }); ctx.fill()

    ctx.strokeStyle = P.graticule; ctx.lineWidth = 0.6
    ctx.beginPath(); path(graticule); ctx.stroke()

    ctx.fillStyle = P.land
    ctx.beginPath(); path(land); ctx.fill()

    // climate cells, clipped to land so coasts stay crisp
    ctx.save()
    ctx.beginPath(); path(land); ctx.clip()
    for (let i = 0; i < cells.length; i++) {
      ctx.fillStyle = colors[i]
      ctx.beginPath(); path(cells[i]); ctx.fill()
    }
    if (s.hover != null && cells[s.hover]) {
      ctx.strokeStyle = P.hover; ctx.lineWidth = 1.5
      ctx.beginPath(); path(cells[s.hover]); ctx.stroke()
    }
    ctx.restore()

    ctx.strokeStyle = P.borders; ctx.lineWidth = 0.5
    ctx.beginPath(); path(borders); ctx.stroke()
    ctx.strokeStyle = P.coast; ctx.lineWidth = 0.7
    ctx.beginPath(); path(land); ctx.stroke()

    // city lights
    const center = [-s.rot[0], -s.rot[1]]
    for (const c of CITIES) {
      if (d3.geoDistance(center, [c.lon, c.lat]) > Math.PI / 2 - 0.05) continue
      const [x, y] = proj([c.lon, c.lat])
      const rr = 1.4 + s.k * 0.5
      const lg = ctx.createRadialGradient(x, y, 0, x, y, rr * 4)
      lg.addColorStop(0, P.lights[0])
      lg.addColorStop(0.3, P.lights[1])
      lg.addColorStop(1, P.lights[2])
      ctx.fillStyle = lg
      ctx.beginPath(); ctx.arc(x, y, rr * 4, 0, 2 * Math.PI); ctx.fill()
      if (s.k > 2.2 && !(s.target && s.target.name === c.name)) {
        ctx.fillStyle = P.cityText
        ctx.font = "11px 'IBM Plex Sans', system-ui, sans-serif"
        ctx.fillText(c.name, x + 6, y - 5)
      }
    }

    // selected place
    if (s.target && d3.geoDistance(center, [s.target.lon, s.target.lat]) < Math.PI / 2) {
      const [x, y] = proj([s.target.lon, s.target.lat])
      const t = (performance.now() % 1800) / 1800
      ctx.strokeStyle = `rgba(${P.pinRing},${1 - t})`; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(x, y, 6 + t * 22, 0, 2 * Math.PI); ctx.stroke()
      ctx.fillStyle = P.pin
      ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 2 * Math.PI); ctx.fill()
      ctx.font = "600 14px 'IBM Plex Sans', system-ui, sans-serif"
      ctx.fillStyle = P.pin
      ctx.shadowColor = P.pinShadow; ctx.shadowBlur = 6
      ctx.fillText(s.target.name, x + 12, y + 5)
      ctx.shadowBlur = 0
    }
    s.proj = proj
  }
  })

  // ---------- size ----------
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      const s = st.current
      s.w = width; s.h = height
      const dpr = window.devicePixelRatio || 1
      canvas.current.width = width * dpr
      canvas.current.height = height * dpr
      canvas.current.style.width = width + 'px'
      canvas.current.style.height = height + 'px'
      drawRef.current()
    })
    ro.observe(wrap.current)
    return () => ro.disconnect()
  }, [])

  // ---------- render loop (idle spin, fly-to, pulse) ----------
  useEffect(() => {
    let raf
    let last = performance.now()
    const tick = (now) => {
      const s = st.current
      const dt = now - last
      last = now
      if (s.anim) {
        const t = Math.min(1, (now - s.anim.t0) / s.anim.dur)
        const e = d3.easeCubicInOut(t)
        s.rot = s.anim.rot(e)
        s.k = s.anim.k0 + (s.anim.k1 - s.anim.k0) * e - Math.sin(Math.PI * e) * s.anim.dip
        s.shift = s.anim.sh0 + (s.anim.sh1 - s.anim.sh0) * e
        if (t >= 1) s.anim = null
      } else if (s.idle && !s.drag && !s.target) {
        s.rot = [s.rot[0] + dt * 0.006, s.rot[1], 0]
      }
      if (s.shift == null) s.shift = 0
      drawRef.current()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // ---------- fly to target ----------
  useEffect(() => {
    const s = st.current
    s.target = target
    const goal = target ? [-target.lon, -target.lat, 0] : [s.rot[0], -15, 0]
    // shortest way round in longitude
    let d = goal[0] - s.rot[0]
    d = ((d + 540) % 360) - 180
    goal[0] = s.rot[0] + d
    const dist = target ? d3.geoDistance([-s.rot[0], -s.rot[1]], [target.lon, target.lat]) : 0
    s.anim = {
      t0: performance.now(),
      dur: target ? 1400 + dist * 500 : 1000,
      rot: d3.interpolate(s.rot, goal),
      k0: s.k,
      k1: target ? ZOOM_IN : 1,
      dip: target && s.k > 1.5 ? Math.min(1.8, dist * 1.2) : 0,
      sh0: s.shift ?? 0,
      sh1: shiftX,
    }
  }, [target, shiftX])

  // ---------- interaction ----------
  const cellAt = (ev) => {
    const s = st.current
    if (!s.proj || !grid) return null
    const rect = canvas.current.getBoundingClientRect()
    const ll = s.proj.invert([ev.clientX - rect.left, ev.clientY - rect.top])
    if (!ll || d3.geoDistance(ll, [-s.rot[0], -s.rot[1]]) > Math.PI / 2) return null
    const c = nearestCell(grid, ll[1], ll[0])
    const ok = c && Math.abs(c.lat - ll[1]) <= grid.dlat * 0.75 && d3.geoContains(land, ll)
    return ok ? { i: c.id, ll } : null
  }

  const onDown = (ev) => {
    const s = st.current
    s.drag = { x: ev.clientX, y: ev.clientY, rot: s.rot, moved: false }
    s.anim = null
    ev.currentTarget.setPointerCapture(ev.pointerId)
  }
  const onMove = (ev) => {
    const s = st.current
    if (s.drag) {
      const dx = ev.clientX - s.drag.x
      const dy = ev.clientY - s.drag.y
      if (Math.abs(dx) + Math.abs(dy) > 3) s.drag.moved = true
      const sens = 0.25 / s.k
      s.rot = [s.drag.rot[0] + dx * sens, Math.max(-85, Math.min(85, s.drag.rot[1] - dy * sens)), 0]
    } else {
      const h = cellAt(ev)
      s.hover = h ? h.i : null
      canvas.current.style.cursor = h ? 'pointer' : 'grab'
    }
  }
  const onUp = (ev) => {
    const s = st.current
    const wasClick = s.drag && !s.drag.moved
    s.drag = null
    if (wasClick) {
      const h = cellAt(ev)
      if (h) onPick?.({ lat: h.ll[1], lon: h.ll[0] })
    }
  }
  const onWheel = (ev) => {
    const s = st.current
    s.anim = null
    s.k = Math.max(0.8, Math.min(8, s.k * Math.exp(-ev.deltaY * 0.0015)))
  }

  return (
    <div ref={wrap} className="globe-wrap">
      <canvas ref={canvas} className="globe" role="img"
        aria-label="Interactive globe. Drag to rotate, scroll to zoom, click land to choose a place."
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
        onPointerLeave={() => { st.current.hover = null }}
        onWheel={onWheel} />
    </div>
  )
}
