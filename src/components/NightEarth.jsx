import * as d3 from 'd3'
import { useEffect, useMemo, useRef } from 'react'
import { feature } from 'topojson-client'
import world from 'world-atlas/countries-110m.json'
import { CITIES } from '../lib/cities'

const land = feature(world, world.objects.land)

// small seeded PRNG so the sky and the lights look the same on every visit
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const gauss = (r) => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r())

// land mask: rasterise the coastline once, then "is this point on land?" is a pixel lookup
let mask
function onLand(lon, lat) {
  if (!mask) {
    const W = 1440
    const H = 720
    const c = document.createElement('canvas')
    c.width = W; c.height = H
    const g = c.getContext('2d')
    const p = d3.geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2])
    g.fillStyle = '#fff'
    g.beginPath(); d3.geoPath(p, g)(land); g.fill()
    mask = { W, H, data: g.getImageData(0, 0, W, H).data }
  }
  const x = Math.floor(((lon + 180) / 360) * mask.W)
  const y = Math.floor(((90 - lat) / 180) * mask.H)
  if (x < 0 || y < 0 || x >= mask.W || y >= mask.H) return false
  return mask.data[(y * mask.W + x) * 4] > 128
}

// city-light points: dense clusters around cities + a sprinkle of towns over land
let lights
function getLights() {
  if (lights) return lights
  const r = rng(7)
  const pts = []
  for (const c of CITIES) {
    const n = 120 + Math.floor(r() * 100)
    for (let i = 0; i < n; i++) {
      const s = 0.12 + r() * r() * 1.4
      const lon = c.lon + gauss(r) * s
      const lat = c.lat + gauss(r) * s * 0.75
      if (onLand(lon, lat)) pts.push([lon, lat, 0.35 + r() * 0.65 * Math.exp(-s)])
    }
  }
  for (let i = 0; i < 90000; i++) {
    const lon = -180 + r() * 360
    const lat = -45 + r() * 115
    if (!onLand(lon, lat)) continue
    // fewer lights in deserts / far north (rough, just for looks)
    if (lat > 62 && r() < 0.8) continue
    if (lat > 15 && lat < 32 && lon > -15 && lon < 50 && r() < 0.85) continue
    pts.push([lon, lat, 0.18 + r() * r() * 0.6])
  }
  lights = pts
  return pts
}

const SPIN = 1.6 // degrees of longitude per second
const TILT = [-2, -4] // phi, gamma of the view
const BUCKETS = 8 // light brightness levels (one fillStyle per level per frame)

/**
 * The opening backdrop: a night-side Earth seen from orbit — glowing blue atmosphere,
 * warm city lights, and the Milky Way across a field of stars. The Earth turns slowly.
 *
 * Performance: the sky, ocean and atmosphere (which don't move as the Earth spins) are
 * baked once per resize into two offscreen layers; each frame only redraws land + lights. Light points are projected with plain math (no d3 per point)
 * and drawn in a few brightness batches. The loop pauses while `active` is false or the
 * tab is hidden.
 */
export default function NightEarth({ active = true, progress }) {
  const ref = useRef(null)
  // twinkling stars: plain elements animated by CSS (opacity/scale only → cheap, GPU-composited)
  const twinkles = useMemo(() => {
    const r = rng(11)
    return Array.from({ length: 80 }, (_, i) => ({
      left: r() * 100,
      top: r() * 55, // the sky above the Earth's edge
      size: 1.2 + r() * r() * 2.6,
      delay: -r() * 6,
      dur: 2.5 + r() * 4,
      sparkle: i % 9 === 0,
      warm: r() < 0.25,
    }))
  }, [])
  const sky = useRef(null)
  const fgRef = useRef(null)
  const oceanRef = useRef(null)
  const skyWrap = useRef(null)
  const planet = useRef(null)
  const sun = useRef(null)
  const warm = useRef(null)
  const progressRef = useRef(progress)
  useEffect(() => { progressRef.current = progress }, [progress])
  const activeRef = useRef(active)
  // pause at once when leaving; resume after the cross-fade so it stays smooth
  useEffect(() => {
    if (!active) { activeRef.current = false; return }
    const id = setTimeout(() => { activeRef.current = true }, 350)
    return () => clearTimeout(id)
  }, [active])

  useEffect(() => {
    const cv = ref.current
    const ctx = cv.getContext('2d')
    let raf
    let w = 0
    let h = 0
    let H = 0 // the planet layer is taller than the screen so it can rise as you scroll
    let dpr = 1
    let edpr = 1 // the moving Earth layer renders a little lighter than the static ones
    let band = { top: 0, height: 0 } // the strip of screen the Earth occupies
    const skyCv = sky.current
    const fgCv = fgRef.current
    const oceanCv = oceanRef.current
    let ready = false

    // light points → unit vectors + brightness bucket, done once
    const pts = getLights()
    const n = pts.length
    const vx = new Float32Array(n)
    const vy = new Float32Array(n)
    const vz = new Float32Array(n)
    const bucket = new Uint8Array(n)
    const amp = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const [lon, lat, a] = pts[i]
      const l = (lon * Math.PI) / 180
      const p = (lat * Math.PI) / 180
      vx[i] = Math.cos(p) * Math.cos(l)
      vy[i] = Math.cos(p) * Math.sin(l)
      vz[i] = Math.sin(p)
      bucket[i] = Math.min(BUCKETS - 1, Math.floor(a * BUCKETS))
      amp[i] = a
    }
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => bucket[a] - bucket[b])
    const bucketStart = new Int32Array(BUCKETS + 1)
    for (const i of order) bucketStart[bucket[i] + 1]++
    for (let b = 0; b < BUCKETS; b++) bucketStart[b + 1] += bucketStart[b]
    const colors = Array.from({ length: BUCKETS }, (_, b) => {
      const a = (b + 0.5) / BUCKETS
      return `rgba(255,${190 + Math.floor(a * 50)},${110 + Math.floor(a * 60)},${Math.min(1, 0.25 + a * 0.9)})`
    })
    const cityVec = CITIES.map((c) => {
      const l = (c.lon * Math.PI) / 180
      const p = (c.lat * Math.PI) / 180
      return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)]
    })

    // soft glow sprite for metro areas
    const glow = document.createElement('canvas')
    glow.width = glow.height = 64
    {
      const g = glow.getContext('2d')
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
      gr.addColorStop(0, 'rgba(255,200,120,0.22)')
      gr.addColorStop(1, 'rgba(255,180,100,0)')
      g.fillStyle = gr
      g.fillRect(0, 0, 64, 64)
    }

    const geom = () => {
      const R = Math.max(w * 0.78, h * 1.05)
      return { R, cx: w / 2, cy: h * 0.6 + R }
    }

    const paintSky = () => {
      skyCv.width = Math.round(w * dpr)
      skyCv.height = Math.round(h * dpr)
      const c = skyCv.getContext('2d')
      c.setTransform(dpr, 0, 0, dpr, 0, 0)
      const r = rng(42)
      c.fillStyle = '#02040b'
      c.fillRect(0, 0, w, h)
      // Milky Way: a soft diagonal band with a warm core and dark dust lanes
      c.save()
      c.translate(w * 0.62, h * 0.2)
      c.rotate(0.38)
      const glowBand = (len, thick, color) => {
        const g = c.createRadialGradient(0, 0, 0, 0, 0, len)
        g.addColorStop(0, color)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        c.save(); c.scale(1, thick / len); c.fillStyle = g
        c.beginPath(); c.arc(0, 0, len, 0, Math.PI * 2); c.fill(); c.restore()
      }
      glowBand(w * 0.75, h * 0.2, 'rgba(120,130,190,0.2)')
      glowBand(w * 0.45, h * 0.1, 'rgba(230,200,170,0.18)')
      c.save(); c.translate(w * 0.05, 0); glowBand(w * 0.2, h * 0.05, 'rgba(255,220,180,0.12)'); c.restore()
      for (let i = 0; i < 3; i++) {
        c.save(); c.translate((r() - 0.5) * w * 0.5, (r() - 0.5) * h * 0.03)
        glowBand(w * (0.12 + r() * 0.15), h * 0.018, 'rgba(0,0,0,0.35)'); c.restore()
      }
      for (let i = 0; i < 2600; i++) {
        const x = (r() - 0.5) * w * 1.6
        const y = gauss(r) * h * 0.05
        c.fillStyle = `rgba(255,248,235,${0.15 + r() * 0.5})`
        c.fillRect(x, y, r() < 0.96 ? 0.8 : 1.5, r() < 0.96 ? 0.8 : 1.5)
      }
      c.restore()
      for (let i = 0; i < 900; i++) {
        const big = r() < 0.04
        c.fillStyle = `rgba(${220 + r() * 35},${225 + r() * 30},255,${0.25 + r() * 0.7})`
        c.beginPath(); c.arc(r() * w, r() * h, big ? 1.3 : 0.6, 0, Math.PI * 2); c.fill()
      }

      // the limb never moves as the Earth spins, so halo + ocean are baked once (planet layer)
      const { R, cx, cy } = geom()
      oceanCv.width = Math.round(w * dpr)
      oceanCv.height = Math.round(H * dpr)
      const o = oceanCv.getContext('2d')
      o.setTransform(dpr, 0, 0, dpr, 0, 0)
      const halo = o.createRadialGradient(cx, cy, R * 0.985, cx, cy, R * 1.09)
      halo.addColorStop(0, 'rgba(70,150,255,0.55)')
      halo.addColorStop(0.25, 'rgba(50,120,255,0.18)')
      halo.addColorStop(1, 'rgba(30,80,200,0)')
      o.fillStyle = halo
      o.beginPath(); o.arc(cx, cy, R * 1.09, 0, Math.PI * 2); o.fill()
      const sea = o.createRadialGradient(cx, cy - R * 0.2, R * 0.4, cx, cy, R)
      sea.addColorStop(0, '#02060f')
      sea.addColorStop(0.85, '#061229')
      sea.addColorStop(1, '#0c2a5c')
      o.fillStyle = sea
      o.beginPath(); o.arc(cx, cy, R, 0, Math.PI * 2); o.fill()

      fgCv.width = oceanCv.width
      fgCv.height = oceanCv.height
      const f = fgCv.getContext('2d')
      f.setTransform(dpr, 0, 0, dpr, 0, 0)
      const top = cy - R
      const night = f.createLinearGradient(0, top, 0, H)
      night.addColorStop(0, 'rgba(2,4,11,0)')
      night.addColorStop(1, 'rgba(2,4,11,0.55)')
      f.save(); f.beginPath(); f.arc(cx, cy, R, 0, Math.PI * 2); f.clip()
      f.fillStyle = night; f.fillRect(0, top, w, H - top); f.restore()
      const rim = f.createRadialGradient(cx, cy, R * 0.955, cx, cy, R * 1.004)
      rim.addColorStop(0, 'rgba(40,120,255,0)')
      rim.addColorStop(0.8, 'rgba(70,160,255,0.45)')
      rim.addColorStop(1, 'rgba(150,215,255,0.95)')
      f.fillStyle = rim
      f.beginPath(); f.arc(cx, cy, R * 1.004, 0, Math.PI * 2); f.fill()
      f.shadowColor = 'rgba(90,170,255,0.9)'; f.shadowBlur = 24
      f.strokeStyle = 'rgba(170,225,255,0.9)'; f.lineWidth = 2
      f.beginPath(); f.arc(cx, cy, R, 0, Math.PI * 2); f.stroke()
    }

    const frame = (t) => {
      const { R, cx, cy } = geom()
      const p = progressRef.current?.current ?? 0
      // scrolling turns the planet a little further and lifts it toward the viewer
      if (planet.current) planet.current.style.transform = `translate3d(0, ${(-p * 0.42 * h).toFixed(1)}px, 0)`
      if (skyWrap.current) skyWrap.current.style.transform = `translate3d(0, ${(-p * 0.08 * h).toFixed(1)}px, 0)`
      // summer: the sun rises over the Earth's edge and warms the atmosphere as you scroll in
      const rise = Math.min(1, Math.max(0, (p - 0.1) / 0.2))
      const s3 = rise * rise * (3 - 2 * rise)
      if (sun.current) {
        sun.current.style.opacity = s3.toFixed(3)
        sun.current.style.transform = `translate3d(-50%, ${(-50 + (1 - s3) * 22).toFixed(1)}%, 0) scale(${(0.75 + s3 * 0.25).toFixed(3)})`
      }
      if (warm.current) warm.current.style.opacity = (s3 * 0.95).toFixed(3)
      const lambda = -14 + (t / 1000) * SPIN + p * 45
      const rot = [lambda, TILT[0], TILT[1]]
      const proj = d3.geoOrthographic().rotate(rot).scale(R).translate([cx, cy]).clipAngle(90).precision(1)
      const rotate = d3.geoRotation(rot)

      // this canvas only covers the Earth strip; shift drawing up by its top offset
      ctx.setTransform(edpr, 0, 0, edpr, 0, -band.top * edpr)
      ctx.clearRect(0, band.top, w, band.height)

      // land, barely lit
      const landStr = d3.geoPath(proj)(land)
      if (landStr) {
        const lp = new Path2D(landStr)
        ctx.fillStyle = '#0b1628'; ctx.fill(lp)
        ctx.strokeStyle = 'rgba(120,165,235,0.22)'; ctx.lineWidth = 0.7; ctx.stroke(lp)
      }

      // rotation as a 3×3 matrix (from d3's own rotation, so it matches the land exactly)
      const ax = rotate([0, 0]); const ay = rotate([90, 0]); const az = rotate([0, 90])
      const toV = ([lo, la]) => {
        const l = (lo * Math.PI) / 180
        const p = (la * Math.PI) / 180
        return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)]
      }
      const X = toV(ax); const Y = toV(ay); const Z = toV(az)
      const top = cy - R

      // city lights, one batch per brightness level
      for (let b = 0; b < BUCKETS; b++) {
        ctx.fillStyle = colors[b]
        for (let k = bucketStart[b]; k < bucketStart[b + 1]; k++) {
          const i = order[k]
          // rotated vector: column-combine of the rotated basis
          const rx = X[0] * vx[i] + Y[0] * vy[i] + Z[0] * vz[i]
          if (rx <= 0.02) continue // far side
          const ry = X[1] * vx[i] + Y[1] * vy[i] + Z[1] * vz[i]
          const rz = X[2] * vx[i] + Y[2] * vy[i] + Z[2] * vz[i]
          const px = cx + R * ry
          const py = cy - R * rz
          if (py < top || py > H + 2 || px < -2 || px > w + 2) continue
          const edge = Math.min(1, Math.max(0.15, (py - top) / (h - top)))
          const s = 0.8 + amp[i] * 1.2 * edge
          ctx.fillRect(px, py, s, s * (0.4 + edge * 0.6))
        }
      }
      for (const [x0, y0, z0] of cityVec) {
        const rx = X[0] * x0 + Y[0] * y0 + Z[0] * z0
        if (rx <= 0.05) continue
        const px = cx + R * (X[1] * x0 + Y[1] * y0 + Z[1] * z0)
        const py = cy - R * (X[2] * x0 + Y[2] * y0 + Z[2] * z0)
        if (py < top || py > H + 18 || px < -18 || px > w + 18) continue
        ctx.drawImage(glow, px - 18, py - 18, 36, 36)
      }

    }

    const resize = () => {
      w = skyCv.clientWidth
      h = skyCv.clientHeight
      dpr = Math.min(2, window.devicePixelRatio || 1)
      H = Math.round(h * 1.5)
      const { R, cy } = geom()
      const top = Math.max(0, Math.floor(cy - R - 4))
      band = { top, height: H - top }
      edpr = Math.min(1.5, dpr)
      cv.width = Math.round(w * edpr)
      cv.height = Math.round(band.height * edpr)
      cv.style.top = top + 'px'
      cv.style.height = band.height + 'px'
      paintSky()
      ready = true
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t0 = performance.now()
    const loop = (now) => {
      if (ready && activeRef.current && !document.hidden) frame(reduce ? 0 : now - t0)
      raf = requestAnimationFrame(loop)
    }
    const ro = new ResizeObserver(() => { resize(); frame(performance.now() - t0) })
    ro.observe(skyCv)
    raf = requestAnimationFrame(loop)
    return () => { ro.disconnect(); cancelAnimationFrame(raf) }
  }, [])

  return (
    <div className="night-earth" aria-hidden>
      <div className="ne-sky" ref={skyWrap}>
      <canvas ref={sky} className="ne-layer" />
      <div className="twinkles">
        {twinkles.map((t, i) => (
          <span key={i} className={'tw' + (t.sparkle ? ' sparkle' : '') + (t.warm ? ' warm' : '')}
            style={{ left: `${t.left}%`, top: `${t.top}%`, width: t.size, height: t.size,
              animationDelay: `${t.delay}s`, animationDuration: `${t.dur}s` }} />
        ))}
      </div>
      </div>
      <div className="ne-planet" ref={planet}>
        {/* the sun sits behind the planet, so the Earth hides its lower half */}
        <div className="ne-sun" ref={sun}><span className="ne-rays" /><span className="ne-flare" /></div>
        <canvas ref={oceanRef} className="ne-layer" />
        <canvas ref={ref} className="ne-layer ne-earth" />
        <canvas ref={fgRef} className="ne-layer" />
        <div className="ne-warm" ref={warm} />
      </div>
    </div>
  )
}
