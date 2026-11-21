# Copilot instructions: climate-future

## Architecture
- This is a Vite + React 19 single-page app; `src/main.jsx` mounts `App.jsx`, and all layout/story behavior is coordinated in `App.jsx`.
- `App.jsx` owns shared state: selected place/cell, scenario, metric, year, hover year, playback, quiz answers, and the story/explore view.
- `src/components/` contains presentation: `Story`/`NightEarth` for the scrolling intro, `Globe` for canvas interaction, and `CityPanel` plus its linked child charts for place details.
- `src/lib/data.js` is the climate-data boundary: loads `public/data/grid.json` once, caches `public/data/cells/<id>.json`, and converts compact arrays into 1950–2100 rows.
- `Globe`, `LengthChart`, `SeasonRibbon`, `YearWheel`, and `YourSeasons` consume the same `scenario`, `year`, and `hoverYear` state; keep year interactions linked instead of introducing isolated state.
- City search is local (`src/lib/cities.js`); selected coordinates are mapped to the nearest model cell with `nearestCell()` rather than geocoding remotely.

## Data conventions
- Scenario keys are exactly `ssp126`, `ssp245`, and `ssp585`; use `SCENARIOS`/`SCEN` from `src/lib/data.js` for labels and exports.
- Season fields use compact `ss/se/sd` for summer and `ws/we/wd` for winter in raw JSON. `prepareCell()` expands these into `series`, plus `summer`, `winter`, `shoulder`, and temperature rows.
- The model year is a 365-day no-leap calendar. Season start/end values are offsets from Jan 1 and may be negative; use `dateLabel()` rather than constructing dates directly.
- `HIST_END` is 2014 and `BASELINE` is 1950–1979. Historical rows are shared across scenarios; 2015–2100 is projected data.
- For place maps, window arrays are 2021–2040, 2041–2060, 2061–2080, and 2081–2100. Globe shading compares summer gain or winter loss against the baseline.
- Do not hand-edit generated `public/data/**/*.json` for modeling fixes; change `scripts/build_data.py` and regenerate it.

## Frontend patterns
- Prefer existing D3 helpers for scales/paths/rolling averages; charts are SVG or canvas rather than a chart component library.
- Canvas components (`Globe.jsx`, `NightEarth.jsx`) deliberately use refs, dirty flags, offscreen canvases, ResizeObserver, and requestAnimationFrame for performance. Preserve cleanup and paused/tab-hidden behavior.
- Use `useWidth()` for responsive SVG/chart sizing and `ResizeObserver` for canvas dimensions. Mobile uses a bottom-sheet layout.
- Shared theme and color tokens live in `src/index.css`, `src/lib/ramps.js`, and scenario/season CSS classes. Keep `ssp126/245/585`, `summer`, and `winter` naming consistent.
- Personalization answers are persisted under the `answers` localStorage key and restored in `App.jsx`; guard browser storage access as existing code does.
- Asset paths must remain deployment-relative: `vite.config.js` uses `base: './'`, and `src/lib/data.js` resolves data through `import.meta.env.BASE_URL`.

## Workflows
- Run locally from `climate-future/`: `npm install && npm run dev`; use `npm run build` and `npm run lint` for validation. `.github/workflows/deploy.yml` validates with Node 22 and deploys `dist` to Pages on `main`.
- No test framework or test script is currently configured; use lint/build and direct browser smoke checks instead.
- Rebuild climate data with the Python script only when source data/model logic changes: activate `.venv`, install `xarray zarr gcsfs cftime numpy pandas`, then run `python scripts/build_data.py` from `climate-future/`.
- The rebuild downloads about 2 GB and caches GCS slices in `scripts/.cache/`; it is slower and network-dependent, not part of the normal npm build.
- When changing the data schema, update both `scripts/build_data.py` and `prepareCell()` in `src/lib/data.js`, then verify the globe summary and a per-cell panel.
