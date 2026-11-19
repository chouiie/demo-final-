import { useMemo, useState } from 'react'
import { CITIES } from '../lib/cities'

export default function CitySearch({ value, onPick, placeholder = 'Search a city…', big }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return CITIES.slice(0, 8)
    return CITIES.filter((c) => c.name.toLowerCase().includes(s) || c.country.toLowerCase().includes(s))
      .sort((a, b) => a.name.toLowerCase().indexOf(s) - b.name.toLowerCase().indexOf(s))
      .slice(0, 8)
  }, [q])

  const pick = (c) => {
    onPick(c)
    setQ('')
    setOpen(false)
  }

  return (
    <div className={'city-search' + (big ? ' big' : '')}>
      <input
        type="text" value={open ? q : q || value || ''} placeholder={placeholder}
        aria-label="Search for a city" aria-autocomplete="list" role="combobox" aria-expanded={open}
        onFocus={() => { setOpen(true); setQ('') }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => { setQ(e.target.value); setHi(0) }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setHi((h) => Math.min(results.length - 1, h + 1))
          else if (e.key === 'ArrowUp') setHi((h) => Math.max(0, h - 1))
          else if (e.key === 'Enter' && results[hi]) { pick(results[hi]); e.currentTarget.blur() }
        }}
      />
      {open && results.length > 0 && (
        <ul className="city-results" role="listbox">
          {results.map((c, i) => (
            <li key={c.name} role="option" aria-selected={i === hi}
              className={i === hi ? 'active' : ''} onMouseDown={() => pick(c)} onMouseEnter={() => setHi(i)}>
              {c.name} <span className="muted">{c.country}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
