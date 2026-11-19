import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// fonts are bundled with the site (no Google Fonts round-trip)
import '@fontsource/titan-one/400.css'
import '@fontsource/rubik/400.css'
import '@fontsource/rubik/500.css'
import '@fontsource/rubik/600.css'
import '@fontsource/rubik/700.css'
import './index.css'
import App from './App.jsx'

// Hold the intro text until the fonts are ready, so it never flashes in a fallback
// font and re-wraps. Give up waiting after 1.5 s so text always appears.
const root = document.documentElement
const ready = () => root.classList.add('fonts-ready')
Promise.race([
  Promise.all([
    document.fonts.load('400 1em "Titan One"'),
    document.fonts.load('400 1em "Rubik"'),
    document.fonts.load('600 1em "Rubik"'),
  ]),
  new Promise((r) => setTimeout(r, 1500)),
]).then(ready, ready)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
