// One-hue sequential ramps on the dark surface (dim → bright = more change)
export const RAMPS = {
  summer: ['#2b211c', '#d95926', '#ffc29e'],
  winter: ['#1f1d33', '#7f72e0', '#d6d0ff'],
}
export const RAMP_MAX = { summer: 180, winter: 120 }

// Canvas colours for the globe itself
export const GLOBE_THEME = {
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
}
