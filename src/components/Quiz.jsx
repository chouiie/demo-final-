import { QUESTIONS } from '../lib/data'

/** Three quick questions, one at a time. Answers personalise every view below. */
export default function Quiz({ place, answers, setAnswer, step, setStep, onDone, onSkip }) {
  const item = QUESTIONS[step]
  const chosen = answers[item.key]

  const choose = (value) => {
    setAnswer(item.key, value)
    if (step < QUESTIONS.length - 1) setTimeout(() => setStep(step + 1), 180)
    else setTimeout(onDone, 180)
  }

  return (
    <section className="card quiz" aria-live="polite">
      <div className="quiz-top">
        <p className="eyebrow">Make it about you · {step + 1} of {QUESTIONS.length}</p>
        <div className="quiz-dots" aria-hidden>
          {QUESTIONS.map((q, i) => <span key={q.key} className={i < step ? 'done' : i === step ? 'on' : ''} />)}
        </div>
      </div>
      <h3 className="quiz-q" key={item.key}>{item.q}</h3>
      <p className="muted small quiz-hint">{item.hint}{step === 0 && ` Then we’ll show what that means for ${place.name}.`}</p>
      <div className={'quiz-opts' + (item.opts.length > 3 ? ' grid' : '')} role="radiogroup" aria-label={item.q}>
        {item.opts.map((o) => (
          <button key={o.value} role="radio" aria-checked={chosen === o.value}
            className={'opt' + (chosen === o.value ? ' sel' : '')} onClick={() => choose(o.value)}>
            <span>{o.label}</span>
            {o.sub && <small>{o.sub}</small>}
          </button>
        ))}
      </div>
      <div className="quiz-nav">
        {step > 0 ? <button className="link-btn" onClick={() => setStep(step - 1)}>← Back</button> : <span />}
        <button className="link-btn" onClick={onSkip}>Skip, show me everything</button>
      </div>
    </section>
  )
}
