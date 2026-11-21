// Illustrated scenes for the scenario guide. Everything is drawn around a local origin
// at the object's base (0,0) so it can "pop" up from the ground. Items appear once the
// page's reveal progress passes their `at` value (0–1, roughly left → right).

const on = (at, prog) => (prog >= at ? ' on' : '')

/** wrapper: positions an item and pops it up from its base when revealed */
function Pop({ x, y, at, prog, s = 1, children, className = '' }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className={'pop' + on(at, prog) + (className ? ' ' + className : '')}>{children}</g>
    </g>
  )
}

function Tree({ tone = ['#3f9d4f', '#58b85f', '#2f8442'] }) {
  return (
    <g>
      <rect x={-4} y={-30} width={8} height={30} rx={2} fill="#7a4e2c" />
      <g className="sway">
        <circle cx={-14} cy={-36} r={15} fill={tone[2]} />
        <circle cx={14} cy={-36} r={15} fill={tone[2]} />
        <circle cx={0} cy={-50} r={22} fill={tone[0]} />
        <circle cx={-6} cy={-56} r={9} fill={tone[1]} opacity={0.8} />
      </g>
    </g>
  )
}

function DryTree() {
  return (
    <g stroke="#5b4027" strokeWidth={4} strokeLinecap="round" fill="none">
      <path d="M0 0 V-48 M0 -30 L-14 -44 M0 -38 L12 -54 M-14 -44 L-20 -50 M12 -54 L18 -58" />
    </g>
  )
}

function Solar() {
  return (
    <g>
      <rect x={-2} y={-14} width={4} height={14} fill="#9aa4b2" />
      <polygon points="-30,-12 30,-12 22,-34 -22,-34" fill="#1f4f8f" stroke="#cfe2ff" strokeWidth={1.2} />
      <g stroke="#7fb0f0" strokeWidth={0.8} opacity={0.7}>
        <line x1={-10} y1={-12} x2={-7} y2={-34} /><line x1={10} y1={-12} x2={7} y2={-34} />
        <line x1={-26} y1={-23} x2={26} y2={-23} />
      </g>
      <polygon className="glint" points="-30,-12 -18,-12 -12,-34 -22,-34" fill="#fff" opacity={0} />
    </g>
  )
}

function Turbine({ h = 140 }) {
  return (
    <g>
      <polygon points={`-3,0 3,0 1.5,${-h} -1.5,${-h}`} fill="#f4f6f8" />
      <g transform={`translate(0 ${-h})`}>
        <g className="spin">
          {[0, 120, 240].map((r) => (
            <path key={r} transform={`rotate(${r})`} d="M0 0 L5 -3 L2.5 -58 L-1.5 -58 Z" fill="#ffffff" stroke="#cfd6de" strokeWidth={0.6} />
          ))}
        </g>
        <circle r={4} fill="#dfe5ea" />
      </g>
    </g>
  )
}

function House({ solar = false, wall = '#efe3cf', roof = '#b9553e' }) {
  return (
    <g>
      <rect x={-26} y={-30} width={52} height={30} fill={wall} />
      <polygon points="-31,-30 0,-54 31,-30" fill={roof} />
      {solar && <polygon points="2,-50 26,-32 14,-32 -6,-46" fill="#1f4f8f" stroke="#cfe2ff" strokeWidth={0.8} />}
      <rect x={-6} y={-16} width={12} height={16} fill="#6e4b33" />
      <rect x={-20} y={-24} width={9} height={8} fill="#9fd3f5" />
      <rect x={11} y={-24} width={9} height={8} fill="#9fd3f5" />
    </g>
  )
}

function Factory({ heavy = false }) {
  const puffs = heavy ? 6 : 3
  return (
    <g>
      <g className="smoke-col" transform="translate(26 -92)">
        {Array.from({ length: puffs }, (_, i) => (
          <circle key={i} className={'puff' + (heavy ? ' heavy' : '')} r={heavy ? 14 : 9}
            fill={heavy ? '#3b3632' : '#b8bcc2'} style={{ animationDelay: `${(-i * (heavy ? 0.7 : 1.3)).toFixed(1)}s` }} />
        ))}
      </g>
      <rect x={20} y={-92} width={12} height={52} fill="#5a5d63" />
      <rect x={-4} y={-76} width={10} height={36} fill="#62656b" />
      <rect x={-46} y={-40} width={92} height={40} fill="#767a82" />
      <polygon points="-46,-40 -46,-54 -28,-40 -28,-54 -10,-40 -10,-54 8,-40" fill="#6a6e75" />
      {[-34, -14, 6, 26].map((x) => <rect key={x} x={x} y={-28} width={10} height={9} fill={heavy ? '#ffb15c' : '#f6d48c'} />)}
    </g>
  )
}

function Pumpjack() {
  return (
    <g>
      <rect x={-34} y={-5} width={68} height={5} fill="#3a3a3a" />
      <polygon points="-12,0 0,-44 12,0" fill="none" stroke="#2c2c2c" strokeWidth={5} />
      <g transform="translate(0 -44)">
        <g className="nod">
          <rect x={-44} y={-4} width={84} height={8} rx={2} fill="#262626" />
          <path d="M38 -10 Q52 -6 50 12 L40 8 Z" fill="#262626" />
          <rect x={-50} y={-2} width={14} height={14} rx={3} fill="#b23b2c" />
        </g>
      </g>
      <line x1={46} y1={10} x2={46} y2={0} stroke="#262626" strokeWidth={2} />
    </g>
  )
}

function Car({ color = '#e2574c' }) {
  return (
    <g>
      <rect x={-20} y={-15} width={40} height={10} rx={4} fill={color} />
      <rect x={-11} y={-23} width={20} height={9} rx={3} fill={color} />
      <rect x={-8} y={-21} width={7} height={5} rx={1} fill="#cfe8f7" /><rect x={1} y={-21} width={6} height={5} rx={1} fill="#cfe8f7" />
      <circle cx={-11} cy={-5} r={4.5} fill="#1d1d1d" /><circle cx={11} cy={-5} r={4.5} fill="#1d1d1d" />
    </g>
  )
}

function Train() {
  return (
    <g>
      <rect x={0} y={-26} width={44} height={20} rx={3} fill="#2c2f36" />
      <rect x={34} y={-38} width={10} height={14} fill="#2c2f36" />
      {[52, 100, 148].map((x) => (
        <g key={x}>
          <rect x={x} y={-20} width={42} height={14} rx={2} fill="#3d3a36" />
          <path d={`M${x + 2} -20 Q${x + 21} -34 ${x + 40} -20 Z`} fill="#141414" />
        </g>
      ))}
      {[10, 30, 60, 84, 108, 132, 156, 180].map((x) => <circle key={x} cx={x} cy={-5} r={4} fill="#111" />)}
    </g>
  )
}

function Birds() {
  return (
    <g fill="none" stroke="#2b3a4a" strokeWidth={2} strokeLinecap="round">
      <path d="M0 0 q6 -6 12 0 q6 -6 12 0" />
      <path d="M30 -14 q5 -5 10 0 q5 -5 10 0" />
      <path d="M-26 -10 q5 -5 10 0 q5 -5 10 0" />
    </g>
  )
}

/** a label naming the term, popping up next to what it describes */
function Chip({ x, y, at, prog, text, tone = 'light' }) {
  const w = text.length * 7.6 + 26
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={'pop chip ' + tone + on(at, prog)}>
        <rect x={-w / 2} y={-30} width={w} height={26} rx={13} />
        <text x={0} y={-12.5} textAnchor="middle">{text}</text>
      </g>
    </g>
  )
}

function Sky({ id, stops }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        {stops.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
      </linearGradient>
    </defs>
  )
}

const P = (d) => ({ className: 'plx', style: { '--d': d } }) // parallax depth for a layer

// ---------------------------------------------------------------------------
export function GreenScene({ prog }) {
  return (
    <svg viewBox="0 0 1000 500" preserveAspectRatio="xMidYMax slice" className="scene-svg" aria-hidden>
      <Sky id="sky1" stops={[[0, '#5fb2ee'], [0.7, '#bfe6ff'], [1, '#e6f7ff']]} />
      <rect width="1000" height="500" fill="url(#sky1)" />
      <g {...P(0.3)}>
        <circle cx={850} cy={95} r={46} fill="#ffe27a" />
        <circle cx={850} cy={95} r={70} fill="#fff3b0" opacity={0.35} className="pulse" />
        <g className={'sparkles' + on(0.82, prog)}>
          {[[120, 70], [300, 120], [560, 60], [700, 140], [960, 200], [420, 180]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y - 7} L${x + 2} ${y - 2} L${x + 7} ${y} L${x + 2} ${y + 2} L${x} ${y + 7} L${x - 2} ${y + 2} L${x - 7} ${y} L${x - 2} ${y - 2} Z`}
              fill="#fff" style={{ animationDelay: `${i * 0.4}s` }} />
          ))}
        </g>
        <g transform="translate(0 150)" className={'fly' + on(0.7, prog)}><Birds /></g>
      </g>
      <g {...P(0.6)}>
        <path d="M-60 330 L0 330 Q180 270 360 310 T720 290 T1000 300 H1060 V500 H-60 Z" fill="#7cc274" />
        <Pop x={660} y={300} at={0.52} prog={prog}><Turbine h={150} /></Pop>
        <Pop x={745} y={292} at={0.58} prog={prog} s={0.85}><Turbine h={150} /></Pop>
        <Pop x={835} y={298} at={0.64} prog={prog} s={1.1}><Turbine h={150} /></Pop>
        <Pop x={90} y={316} at={0.04} prog={prog} s={0.8}><Tree /></Pop>
        <Pop x={170} y={300} at={0.08} prog={prog} s={0.9}><Tree /></Pop>
      </g>
      <g {...P(1)}>
        <path d="M-60 400 L0 400 Q250 360 500 390 T1000 380 H1060 V500 H-60 Z" fill="#4fa557" />
        <Pop x={60} y={408} at={0.02} prog={prog} s={1.2}><Tree /></Pop>
        <Pop x={235} y={398} at={0.13} prog={prog} s={1.05}><Tree /></Pop>
        <Pop x={310} y={394} at={0.2} prog={prog}><Solar /></Pop>
        <Pop x={372} y={392} at={0.24} prog={prog}><Solar /></Pop>
        <Pop x={434} y={392} at={0.28} prog={prog}><Solar /></Pop>
        <Pop x={520} y={392} at={0.34} prog={prog} s={1.15}><House solar /></Pop>
        <Pop x={600} y={392} at={0.42} prog={prog} s={1.1}><Tree tone={['#57b45b', '#7fd07a', '#3f9a4b']} /></Pop>
        <Pop x={900} y={386} at={0.74} prog={prog} s={1.25}><Tree /></Pop>
        <Pop x={968} y={384} at={0.78} prog={prog} s={0.95}><Tree /></Pop>
        <path d="M-60 460 L0 460 Q500 430 1000 460 H1060 V500 H-60 Z" fill="#3f8f4a" />
      </g>
      <Chip x={245} y={305} at={0.1} prog={prog} text="🌳 Trees regrow" />
      <Chip x={372} y={340} at={0.26} prog={prog} text="☀️ Solar power" />
      <Chip x={745} y={120} at={0.6} prog={prog} text="💨 Wind power" />
      <Chip x={600} y={250} at={0.86} prog={prog} text="🌬️ Clean air" />
    </svg>
  )
}

export function MiddleScene({ prog }) {
  return (
    <svg viewBox="0 0 1000 500" preserveAspectRatio="xMidYMax slice" className="scene-svg" aria-hidden>
      <Sky id="sky2" stops={[[0, '#8fb0c8'], [0.75, '#d9dccf'], [1, '#e9e2cc']]} />
      <rect width="1000" height="500" fill="url(#sky2)" />
      <g {...P(0.3)}>
        <circle cx={830} cy={110} r={42} fill="#fbe7a6" />
        <rect y={210} width="1000" height="140" fill="#d9cfb4" opacity={0.35} className={'haze' + on(0.78, prog)} />
      </g>
      <g {...P(0.6)}>
        <path d="M-60 320 L0 320 Q200 285 420 305 T820 295 T1000 305 H1060 V500 H-60 Z" fill="#a5b97c" />
        <Pop x={660} y={300} at={0.5} prog={prog} s={0.9}><Turbine h={140} /></Pop>
        <Pop x={720} y={298} at={0.55} prog={prog} s={0.75}><Turbine h={140} /></Pop>
        <Pop x={430} y={306} at={0.3} prog={prog} s={1.1}><Factory /></Pop>
      </g>
      <g {...P(1)}>
        <path d="M-60 395 L0 395 Q300 370 600 388 T1000 380 H1060 V500 H-60 Z" fill="#88a265" />
        <Pop x={40} y={398} at={0.01} prog={prog} s={0.9}><Tree tone={['#6f9a50', '#8bb465', '#5a8643']} /></Pop>
        <Pop x={110} y={396} at={0.04} prog={prog}><House /></Pop>
        <Pop x={180} y={394} at={0.08} prog={prog} s={0.95}><House wall="#e6d8c2" roof="#8d5a48" /></Pop>
        <Pop x={250} y={392} at={0.12} prog={prog}><House wall="#efe6d6" roof="#9c4b3a" /></Pop>
        <Pop x={790} y={390} at={0.62} prog={prog}><Solar /></Pop>
        <Pop x={850} y={388} at={0.66} prog={prog}><Solar /></Pop>
        <Pop x={940} y={388} at={0.72} prog={prog} s={1.1}><Tree tone={['#6f9a50', '#8bb465', '#5a8643']} /></Pop>
        {/* road */}
        <rect x={-60} y={440} width="1120" height="40" fill="#5b5d61" />
        <g stroke="#e9e3c9" strokeWidth={3} strokeDasharray="22 18"><line x1={-60} y1={460} x2={1060} y2={460} /></g>
        <g className={'traffic' + on(0.2, prog)}>
          <g className="drive" style={{ '--dur': '11s', '--delay': '0s' }}><g transform="translate(0 458)"><Car color="#e2574c" /></g></g>
          <g className="drive" style={{ '--dur': '13s', '--delay': '-5s' }}><g transform="translate(0 458)"><Car color="#3a78c9" /></g></g>
          <g className="drive back" style={{ '--dur': '12s', '--delay': '-3s' }}><g transform="translate(0 478)"><Car color="#e6b84a" /></g></g>
        </g>
      </g>
      <Chip x={180} y={330} at={0.08} prog={prog} text="🏘️ Life as usual" />
      <Chip x={300} y={428} at={0.24} prog={prog} text="🚗 Mostly gas cars" />
      <Chip x={455} y={180} at={0.34} prog={prog} text="🏭 Coal still burns" />
      <Chip x={800} y={330} at={0.64} prog={prog} text="☀️ Some clean energy" />
      <Chip x={600} y={95} at={0.84} prog={prog} text="🌫️ A little haze" />
    </svg>
  )
}

export function FossilScene({ prog }) {
  return (
    <svg viewBox="0 0 1000 500" preserveAspectRatio="xMidYMax slice" className="scene-svg" aria-hidden>
      <Sky id="sky3" stops={[[0, '#7a3f26'], [0.55, '#c9773f'], [1, '#f0b471']]} />
      <rect width="1000" height="500" fill="url(#sky3)" />
      <g {...P(0.3)}>
        <circle cx={820} cy={120} r={44} fill="#ff8a3d" opacity={0.85} />
        <circle cx={820} cy={120} r={80} fill="#ff6a2a" opacity={0.18} className="pulse" />
        <g className={'smog' + on(0.62, prog)}>
          <ellipse cx={250} cy={160} rx={240} ry={40} fill="#5c4637" opacity={0.35} />
          <ellipse cx={700} cy={210} rx={300} ry={46} fill="#4f3c30" opacity={0.3} />
        </g>
      </g>
      <g {...P(0.6)}>
        <path d="M-60 325 L0 325 Q240 290 480 312 T1000 300 H1060 V500 H-60 Z" fill="#a08a5c" />
        <Pop x={130} y={318} at={0.04} prog={prog} s={1.05}><Factory heavy /></Pop>
        <Pop x={310} y={316} at={0.18} prog={prog} s={0.9}><Factory heavy /></Pop>
        <Pop x={770} y={304} at={0.58} prog={prog} s={1.15}><Factory heavy /></Pop>
      </g>
      <g {...P(1)}>
        <path d="M-60 398 L0 398 Q300 372 600 392 T1000 384 H1060 V500 H-60 Z" fill="#8b744c" />
        <Pop x={470} y={396} at={0.34} prog={prog}><Pumpjack /></Pop>
        <Pop x={570} y={394} at={0.4} prog={prog} s={0.85}><Pumpjack /></Pop>
        <Pop x={660} y={392} at={0.48} prog={prog}><DryTree /></Pop>
        <Pop x={920} y={388} at={0.76} prog={prog} s={1.1}><Pumpjack /></Pop>
        <g className={'traffic' + on(0.5, prog)}>
          <g className="drive slow" style={{ '--dur': '24s', '--delay': '-6s' }}><g transform="translate(0 422)"><Train /></g></g>
        </g>
        {/* highway */}
        <rect x={-60} y={436} width="1120" height="56" fill="#4a4a4d" />
        <g stroke="#e8d27a" strokeWidth={3} strokeDasharray="22 16"><line x1={-60} y1={464} x2={1060} y2={464} /></g>
        <g className={'traffic' + on(0.24, prog)}>
          {['#e2574c', '#3a78c9', '#e6b84a', '#7c5cc4', '#d9d9d9', '#2f9e6e'].map((c, i) => (
            <g key={i} className={'drive' + (i % 2 ? ' back' : '')} style={{ '--dur': `${6 + (i % 3) * 1.6}s`, '--delay': `${-i * 1.3}s` }}>
              <g transform={`translate(0 ${i % 2 ? 488 : 460})`}><Car color={c} /></g>
            </g>
          ))}
        </g>
      </g>
      <g className={'heatwaves' + on(0.84, prog)} fill="none" stroke="#ffd29a" strokeWidth={2.5} strokeLinecap="round">
        {[140, 360, 560, 780, 940].map((x, i) => (
          <path key={x} d={`M${x} 300 q8 -12 0 -24 q-8 -12 0 -24 q8 -12 0 -24`} style={{ animationDelay: `${i * 0.35}s` }} />
        ))}
      </g>
      <Chip x={430} y={262} at={0.08} prog={prog} text="🏭 Coal power booms" tone="dark" />
      <Chip x={300} y={428} at={0.28} prog={prog} text="🚗 Highways everywhere" tone="dark" />
      <Chip x={520} y={330} at={0.38} prog={prog} text="🛢️ Oil keeps pumping" tone="dark" />
      <Chip x={470} y={110} at={0.66} prog={prog} text="🌫️ Thick smog" tone="dark" />
      <Chip x={860} y={250} at={0.86} prog={prog} text="🔥 Extreme heat" tone="dark" />
    </svg>
  )
}
