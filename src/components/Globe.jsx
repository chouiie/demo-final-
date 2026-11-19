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
const SPHERE = { type: 'Sphere' }

const ZOOM_IN = 3.6
const BINS = 32 // colour steps: cells sharing a bin are filled in one draw call
const MAX_DPR = 2
const RAD = Math.PI / 180

/** Pre-rendered soft glow for city lights (drawn with drawImage instead of a gradient per city per frame). */
function glowSprite(stops) {
  const size = 64
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, stops[0])
  grad.addColorStop(0.3, stops[1])
  grad.addColorStop(1, stops[2])
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  return c
}

/**
 * Orthographic Earth on canvas. Land grid cells are coloured by days of summer gained
 * (or winter lost) for the chosen scenario + 20-year window. Drag to spin, scroll to
 * zoom, click to pick a place. When `target` changes the globe flies to it.
 *
 * Performance: two canvases. The heavy "map" layer is only redrawn when the view or the
 * data changes (dirty flag), draws only cells inside the visible cap, and batches cells
 * by colour bin. The light "overlay" layer carries the pulsing pin every frame.
 */
export default function Globe({ grid, scenario, metric, windowIdx, target, onPick, shiftX = 0 }) {
  const wrap = useRef(null)
  const canvas = useRef(null)
  const overlay = useRef(null)
  const st = useRef({ rot: [20, -15, 0], k: 1, w: 800, h: 600, dpr: 1, shift: 0, drag: null, anim: null, hover: null, dirty: true })
  const drawRef = useRef(() => {})
  const overlayRef = useRef(() => {})

  const cells = useMemo(() => {
    if (!grid) return []
    const hy = grid.dlat / 2
    const hx = grid.dlon / 2
    return grid.cells.map((c) => {
      const [w, e, s, n] = [c.lon - hx, c.lon + hx, Math.max(-89.9, c.lat - hy), Math.min(89.9, c.lat + hy)]
      return {
        lon: c.lon, lat: c.lat,
        geo: { type: 'Polygon', coordinates: [[[w, s], [w, n], [e, n], [e, s], [w, s]]] },
      }
    })
  }, [grid])

  // colour bin per cell + the bin colours
  const shading = useMemo(() => {
    if (!grid) return { bin: [], palette: [] }
    const base = grid.summary.baseline[metric]
    const fut = grid.summary[scenario][metric][windowIdx]
    const [a, m, z] = RAMPS[metric]
    const max = RAMP_MAX[metric]
    const sc = d3.scaleLinear().domain([0, max / 2, max]).range([a, m, z]).interpolate(d3.interpolateLab).clamp(true)
    const palette = d3.range(BINS).map((i) => sc((i / (BINS - 1)) * max))
    const bin = base.map((b, i) => {
      const v = Math.max(0, metric === 'summer' ? fut[i] - b : b - fut[i])
      return Math.min(BINS - 1, Math.round((v / max) * (BINS - 1)))
    })
    return { bin, palette }
  }, [grid, scenario, metric, windowIdx])

  const sprite = useMemo(() => glowSprite(GLOBE_THEME.lights), [])

  // ---------- drawing (refreshed after every render so it sees current props) ----------
  useLayoutEffect(() => {
    const P = GLOBE_THEME

    drawRef.current = () => {
      const cv = canvas.current
      if (!cv) return
      const s = st.current
      const ctx = cv.getContext('2d')
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0)
      ctx.clearRect(0, 0, s.w, s.h)
      const r0 = Math.min(s.w, s.h) * 0.42
      const R = r0 * s.k
      const cx = s.w / 2 + s.shift
      const cy = s.h / 2
      const moving = !!(s.anim || s.drag || s.spinning)
      const proj = d3.geoOrthographic().rotate(s.rot).scale(R).translate([cx, cy]).clipAngle(90)
        .precision(moving ? 1.2 : 0.5)
      const path = d3.geoPath(proj, ctx)
      const svgPath = d3.geoPath(proj)
      s.proj = proj

      // what part of the sphere is on screen: angular radius of the visible cap
      const halfDiag = Math.hypot(Math.max(cx, s.w - cx), Math.max(cy, s.h - cy))
      const capAngle = halfDiag >= R ? Math.PI / 2 : Math.asin(halfDiag / R)
      const center = [-s.rot[0], -s.rot[1]]
      const cull = capAngle + 2.5 * RAD // + half a cell diagonal
      const cosCull = Math.cos(cull)
      const c0 = [Math.cos(center[1] * RAD) * Math.cos(center[0] * RAD), Math.cos(center[1] * RAD) * Math.sin(center[0] * RAD), Math.sin(center[1] * RAD)]
      const visible = (lon, lat) => {
        const cl = Math.cos(lat * RAD)
        return cl * Math.cos(lon * RAD) * c0[0] + cl * Math.sin(lon * RAD) * c0[1] + Math.sin(lat * RAD) * c0[2] > cosCull
      }

      // atmosphere glow
      const g = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.22)
      g.addColorStop(0, P.glow[0])
      g.addColorStop(1, P.glow[1])
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.22, 0, 2 * Math.PI); ctx.fill()

      // ocean
      const og = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R)
      og.addColorStop(0, P.ocean[0])
      og.addColorStop(1, P.ocean[1])
      ctx.fillStyle = og
      ctx.beginPath(); path(SPHERE); ctx.fill()

      ctx.strokeStyle = P.graticule; ctx.lineWidth = 0.6
      ctx.beginPath(); path(graticule); ctx.stroke()

      // land outline built once, reused for fill / clip / stroke
      const landStr = svgPath(land)
      const landPath = landStr ? new Path2D(landStr) : null
      if (landPath) {
        ctx.fillStyle = P.land
        ctx.fill(landPath)

        // climate cells, batched by colour bin, clipped to land so coasts stay crisp
        ctx.save()
        ctx.clip(landPath)
        const { bin, palette } = shading
        for (let b = 0; b < BINS; b++) {
          ctx.beginPath()
          let any = false
          for (let i = 0; i < cells.length; i++) {
            if (bin[i] !== b) continue
            const c = cells[i]
            if (!visible(c.lon, c.lat)) continue
            path(c.geo)
            any = true
          }
          if (any) { ctx.fillStyle = palette[b]; ctx.fill() }
        }
        if (s.hover != null && cells[s.hover]) {
          ctx.strokeStyle = P.hover; ctx.lineWidth = 1.5
          ctx.beginPath(); path(cells[s.hover].geo); ctx.stroke()
        }
        ctx.restore()

        ctx.strokeStyle = P.borders; ctx.lineWidth = 0.5
        ctx.beginPath(); path(borders); ctx.stroke()
        ctx.strokeStyle = P.coast; ctx.lineWidth = 0.7
        ctx.stroke(landPath)
      }

      // city lights (sprite) + names when zoomed in
      const rr = (1.4 + s.k * 0.5) * 4
      const showNames = s.k > 2.2
      if (showNames) {
        ctx.fillStyle = P.cityText
        ctx.font = "11px 'Open Sans', system-ui, sans-serif"
      }
      for (const c of CITIES) {
        if (!visible(c.lon, c.lat) || d3.geoDistance(center, [c.lon, c.lat]) > Math.PI / 2 - 0.05) continue
        const [x, y] = proj([c.lon, c.lat])
        if (x < -rr || y < -rr || x > s.w + rr || y > s.h + rr) continue
        ctx.drawImage(sprite, x - rr, y - rr, rr * 2, rr * 2)
        if (showNames && !(s.target && s.target.name === c.name)) ctx.fillText(c.name, x + 6, y - 5)
      }
    }

    // light layer: pulsing pin + label for the selected place
    overlayRef.current = () => {
      const cv = overlay.current
      const s = st.current
      if (!cv || !s.proj) return
      const ctx = cv.getContext('2d')
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0)
      ctx.clearRect(0, 0, s.w, s.h)
      if (!s.target) return
      const center = [-s.rot[0], -s.rot[1]]
      if (d3.geoDistance(center, [s.target.lon, s.target.lat]) >= Math.PI / 2) return
      const [x, y] = s.proj([s.target.lon, s.target.lat])
      const t = (performance.now() % 1800) / 1800
      ctx.strokeStyle = `rgba(${P.pinRing},${1 - t})`; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(x, y, 6 + t * 22, 0, 2 * Math.PI); ctx.stroke()
      ctx.fillStyle = P.pin
      ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 2 * Math.PI); ctx.fill()
      ctx.font = "600 14px 'Open Sans', system-ui, sans-serif"
      ctx.shadowColor = P.pinShadow; ctx.shadowBlur = 6
      ctx.fillText(s.target.name, x + 12, y + 5)
      ctx.shadowBlur = 0
    }

    st.current.dirty = true // props changed → repaint once
  })

  // ---------- size ----------
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      const s = st.current
      s.w = width; s.h = height
      s.dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1)
      for (const cv of [canvas.current, overlay.current]) {
        cv.width = Math.round(width * s.dpr)
        cv.height = Math.round(height * s.dpr)
        cv.style.width = width + 'px'
        cv.style.height = height + 'px'
      }
      s.dirty = true
    })
    ro.observe(wrap.current)
    return () => ro.disconnect()
  }, [])

  // ---------- render loop: only repaint the map layer when something changed ----------
  useEffect(() => {
    let raf
    let last = performance.now()
    let hadTarget = false
    const tick = (now) => {
      const s = st.current
      const dt = Math.min(50, now - last)
      last = now
      if (s.anim) {
        const t = Math.min(1, (now - s.anim.t0) / s.anim.dur)
        const e = d3.easeCubicInOut(t)
        s.rot = s.anim.rot(e)
        s.k = s.anim.k0 + (s.anim.k1 - s.anim.k0) * e - Math.sin(Math.PI * e) * s.anim.dip
        s.shift = s.anim.sh0 + (s.anim.sh1 - s.anim.sh0) * e
        if (t >= 1) { s.anim = null; s.settle = true }
        s.dirty = true
      }
      s.spinning = !s.anim && !s.drag && !s.target
      if (s.spinning) {
        s.rot = [s.rot[0] + dt * 0.006, s.rot[1], 0]
        s.dirty = true
      }
      if (s.dirty) {
        drawRef.current()
        s.dirty = false
      } else if (s.settle) {
        // one sharp, full-precision frame after motion stops
        s.settle = false
        drawRef.current()
      }
      if (s.target || hadTarget) overlayRef.current()
      hadTarget = !!s.target
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
      s.dirty = true
    } else {
      const h = cellAt(ev)
      const next = h ? h.i : null
      if (next !== s.hover) { s.hover = next; s.dirty = true }
      canvas.current.style.cursor = h ? 'pointer' : 'grab'
    }
  }
  const onUp = (ev) => {
    const s = st.current
    const wasClick = s.drag && !s.drag.moved
    s.drag = null
    s.settle = true
    if (wasClick) {
      const h = cellAt(ev)
      if (h) onPick?.({ lat: h.ll[1], lon: h.ll[0] })
    }
  }
  const onWheel = (ev) => {
    const s = st.current
    s.anim = null
    s.k = Math.max(0.8, Math.min(8, s.k * Math.exp(-ev.deltaY * 0.0015)))
    s.dirty = true
  }

  return (
    <div ref={wrap} className="globe-wrap">
      <canvas ref={canvas} className="globe" role="img"
        aria-label="Interactive globe. Drag to rotate, scroll to zoom, click land to choose a place."
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
        onPointerLeave={() => { const s = st.current; if (s.hover != null) { s.hover = null; s.dirty = true } }}
        onWheel={onWheel} />
      <canvas ref={overlay} className="globe-overlay" aria-hidden />
    </div>
  )
}
