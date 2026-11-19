// One-hue sequential ramps for the globe layer. Dark: dim → bright = more change.
// Light: pale → deep = more change. Each mode has its own steps (not an auto-flip).
export const RAMPS = {
  dark: {
    summer: ['#2b211c', '#d95926', '#ffc29e'],
    winter: ['#1f1d33', '#7f72e0', '#d6d0ff'],
  },
  light: {
    summer: ['#fbe9df', '#e05a20', '#7a2a08'],
    winter: ['#ecebfb', '#6250d6', '#2c2170'],
  },
}
export const RAMP_MAX = { summer: 180, winter: 120 }

// Canvas colours for the globe itself
export const GLOBE_THEME = {
  dark: {
    glow: ['rgba(90,150,255,0.35)', 'rgba(90,150,255,0)'],
    ocean: ['#13213d', '#070c18'],
    graticule: 'rgba(140,170,230,0.08)',
    land: '#161d2b',
    hover: 'rgba(255,255,255,0.9)',
    borders: 'rgba(220,230,255,0.22)',
    coast: 'rgba(220,230,255,0.35)',
    lights: ['rgba(255,236,190,0.95)', 'rgba(255,210,140,0.45)', 'rgba(255,200,120,0)'],
    cityText: 'rgba(230,236,250,0.75)',
    pin: '#ffffff',
    pinRing: '255,255,255',
    pinShadow: 'rgba(0,0,0,0.8)',
  },
  light: {
    glow: ['rgba(120,170,235,0.45)', 'rgba(120,170,235,0)'],
    ocean: ['#e9f2fb', '#bcd3ea'],
    graticule: 'rgba(40,80,140,0.10)',
    land: '#e8e4dc',
    hover: 'rgba(20,20,30,0.9)',
    borders: 'rgba(40,40,60,0.28)',
    coast: 'rgba(40,40,60,0.45)',
    lights: ['rgba(40,30,25,0.9)', 'rgba(40,30,25,0.35)', 'rgba(40,30,25,0)'],
    cityText: 'rgba(25,25,35,0.85)',
    pin: '#14141c',
    pinRing: '20,20,28',
    pinShadow: 'rgba(255,255,255,0.9)',
  },
}
