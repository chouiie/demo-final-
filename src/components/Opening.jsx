import { SLIDES } from '../lib/slides'
import NightEarth from './NightEarth'


/**
 * Three leading-question slides over a spinning night-side Earth. The backdrop stays
 * put while the words change; the last slide hands off to the globe.
 */
export default function Opening({ slide, setSlide, onStart, active }) {
  return (
    <section className="opening" id="top" aria-label="Introduction" inert={!active ? true : undefined}>
      <NightEarth active={active} />

      <div className="slides" aria-live="polite">
        {SLIDES.map((s, i) => (
          <div key={i} className={'slide ' + (i === slide ? 'on' : i < slide ? 'past' : 'next')} aria-hidden={i !== slide}>
            <p className="eyebrow">{s.kicker}</p>
            <h1>{s.title}</h1>
            {s.body}
            {s.cta && (
              <button className="btn cta" onClick={onStart} tabIndex={i === slide ? 0 : -1}>Find your city →</button>
            )}
          </div>
        ))}
      </div>

      <div className="slide-nav">
        <div className="dots" role="tablist" aria-label="Intro slides">
          {SLIDES.map((_, i) => (
            <button key={i} role="tab" aria-selected={i === slide} aria-label={`Slide ${i + 1}`}
              className={i === slide ? 'on' : ''} onClick={() => setSlide(i)} />
          ))}
          <button role="tab" aria-selected={false} aria-label="The globe" className="globe-dot" onClick={onStart} />
        </div>
        {slide < SLIDES.length - 1 && (
          <button className="scroll-cue" onClick={() => setSlide(slide + 1)}>
            <span>Next</span>
            <span className="scroll-arrow" aria-hidden>→</span>
          </button>
        )}
      </div>
    </section>
  )
}
