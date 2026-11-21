import { useEffect, useRef, useState } from 'react'
import NightEarth from './NightEarth'

// Land-average season lengths (days/yr, area-weighted over every CanESM5 land cell)
const CALENDAR = [
  { label: '1950–79', sub: 'how it used to be', summer: 126, winter: 134 },
  { label: '2090s', sub: 'Low emissions · SSP1-2.6', summer: 193, winter: 62 },
  { label: '2090s', sub: 'Middle · SSP2-4.5', summer: 213, winter: 37 },
  { label: '2090s', sub: 'High emissions · SSP5-8.5', summer: 255, winter: 7 },
]

const BEATS = 4

/** headline split into words so each one can pop in on its own beat */
function Words({ text }) {
  const words = text.split(' ')
  return words.map((wd, i) => (
    <span key={i}>
      <span className="w" style={{ '--i': i }}>{wd}</span>{i < words.length - 1 ? ' ' : ''}
    </span>
  ))
}

const ease = (t) => 1 - Math.pow(1 - t, 3)

/**
 * Scrolling story over a fixed night-side Earth. Each "beat" fades in as it reaches the
 * middle of the screen; the Earth turns and rises as you scroll. Scrolling past the end
 * (or the button) dives into the globe.
 */
export default function Story({ active, onExplore }) {
  const progress = useRef(0)
  const root = useRef(null)
  const [current, setCurrent] = useState(0)
  const [seen, setSeen] = useState(() => new Set([0]))
  const [countT, setCountT] = useState(0) // ms since the calendar beat first appeared
  const [reduceMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  // scroll progress → Earth; reaching the very bottom → dive into the globe
  useEffect(() => {
    if (!active) return
    let armed = false // only dive after the user has scrolled up from the bottom at least once since arriving
    let raf = 0
    const inners = [...root.current.querySelectorAll('.beat-inner')]
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const update = () => {
      raf = 0
      const vh = window.innerHeight
      const max = document.documentElement.scrollHeight - vh
      const y = window.scrollY
      progress.current = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0
      if (y < max - 120) armed = true
      if (armed && y >= max - 2) onExplore()
      if (reduce) return
      // each section drifts, scales and fades with its distance from the middle of the screen
      for (const el of inners) {
        const r = el.parentElement.getBoundingClientRect()
        const d = (r.top + r.height / 2 - vh / 2) / vh // 0 = centred, ±1 = a screen away
        const a = Math.min(1, Math.abs(d))
        el.style.transform = `translate3d(0, ${(-d * 70).toFixed(1)}px, 0) scale(${(1 - a * 0.07).toFixed(3)})`
        el.style.opacity = String(Math.max(0, 1 - Math.max(0, a - 0.25) * 1.6).toFixed(3))
      }
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [active, onExplore])

  // which beat is in the middle of the screen
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const i = Number(e.target.dataset.beat)
          setCurrent(i)
          setSeen((s) => (s.has(i) ? s : new Set(s).add(i)))
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    root.current.querySelectorAll('[data-beat]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  // the calendar numbers count up while their bars grow
  const calSeen = seen.has(1)
  useEffect(() => {
    if (!calSeen || reduceMotion) return
    let raf
    const t0 = performance.now()
    const tick = (now) => {
      setCountT(now - t0)
      if (now - t0 < 1900) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [calSeen, reduceMotion])
  const counted = (v, row) => (reduceMotion ? v : Math.round(v * ease(Math.min(1, Math.max(0, (countT - row * 180) / 1100)))))

  const go = (i) => document.querySelector(`.story [data-beat="${i}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const cls = (i) => 'beat' + (seen.has(i) ? ' in' : '')

  return (
    <div className="story" ref={root} inert={!active ? true : undefined} aria-hidden={!active}>
      <div className="story-bg">
        <NightEarth active={active} progress={progress} />
      </div>

      <nav className="story-rail" aria-label="Story progress">
        {Array.from({ length: BEATS }, (_, i) => (
          <button key={i} className={i === current ? 'on' : ''} aria-label={`Part ${i + 1}`} onClick={() => go(i)} />
        ))}
      </nav>

      <section className={cls(0) + ' first'} data-beat={0}>
        <div className="beat-inner">
        <p className="eyebrow">CMIP6 climate projections · 1950–2100</p>
        <h1><Words text="Wonder how the seasons are changing?" /></h1>
        <p className="beat-sub">Climate change doesn’t only make days hotter. It moves the calendar.</p>
        <button className="scroll-cue down" onClick={() => go(1)}>
          <span>Scroll to begin</span>
          <span className="scroll-arrow" aria-hidden>↓</span>
        </button>
        </div>
      </section>

      <section className={cls(1) + ' data'} data-beat={1}>
        <div className="beat-inner">
        <p className="eyebrow">Averaged over Earth’s land</p>
        <h2><Words text="Summer is taking over the calendar." /></h2>
        <div className="calendar" role="img" aria-label="Average days of summer, mild weather and winter per year across Earth's land">
          <div className="cal-legend" aria-hidden>
            <span><i className="sw summer" />Summer</span>
            <span><i className="sw mild" />Mild days</span>
            <span><i className="sw winter" />Winter</span>
          </div>
          {CALENDAR.map((r, i) => {
            const mild = 365 - r.summer - r.winter
            return (
              <div className="cal-row" key={i} style={{ '--d': `${i * 0.18}s` }}>
                <div className="cal-label"><b>{r.label}</b><small>{r.sub}</small></div>
                <div className="cal-bar">
                  <span className="cal-seg summer" style={{ '--w': `${(r.summer / 365) * 100}%` }}>{counted(r.summer, i)}</span>
                  <span className="cal-seg mild" style={{ '--w': `${(mild / 365) * 100}%` }}>{mild > 40 ? counted(mild, i) : ''}</span>
                  <span className="cal-seg winter" style={{ '--w': `${(r.winter / 365) * 100}%` }}>{r.winter > 20 ? counted(r.winter, i) : ''}</span>
                </div>
              </div>
            )
          })}
          <p className="cal-note">
            Days per year. Summer = days hotter than a place’s hottest-25% line from 1950–79; winter = colder than its coldest-25% line.
            Under high emissions the average winter on land shrinks from 134 days to <b>7</b>.
          </p>
        </div>
        </div>
      </section>

      <section className={cls(2)} data-beat={2}>
        <div className="beat-inner">
        <p className="eyebrow">It’s not the same everywhere</p>
        <h2><Words text="Wonder how that affects your hometown?" /></h2>
        <p className="beat-sub">
          Some places lose their winter entirely. Others gain months of summer.
          How much depends on where you live, and on the choices we make now.
        </p>
        </div>
      </section>

      <section className={cls(3)} data-beat={3}>
        <div className="beat-inner">
        <p className="eyebrow">Your climate, your future</p>
        <h2><Words text="Explore why, with us." /></h2>
        <button className="btn cta" onClick={onExplore}>Find your city</button>
        <p className="dive-hint">or keep scrolling to dive in <span className="scroll-arrow" aria-hidden>↓</span></p>
        </div>
      </section>

      <div className="story-end" aria-hidden />
    </div>
  )
}
