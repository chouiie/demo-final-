# Your Climate, Your Future: Not All Climate Change is Equal

An explorable globe that shows how summer and winter shift in any place on Earth through 2100 under three CMIP6 emissions scenarios (SSP1-2.6, SSP2-4.5, SSP5-8.5).

**Team:** Chau Nguyen, Yuxuan Zhu, Ricardo Campos Murillo, Andy Li

## Run it

```bash
npm install
npm run dev
```

## How to use

- Search a city or click any land on the globe; the globe flies to that place.
- Drag to spin the globe and scroll to zoom. Use the sun/moon button to switch between dark and bright mode.
- The globe colors every model grid cell by days of summer gained (or winter lost) compared with 1950–79.
- The city panel has a guess-then-reveal question, a scenario toggle, a year slider with play, a season clock, summer and winter length charts, and an every-year season ribbon. All views are linked: hover or click a year in any chart to update the others.

## Data and method

- **Source:** NOAA / Google Cloud Public CMIP6 dataset (`gs://cmip6`), CanESM5 `r2i1p1f1`, daily near-surface air temperature (`tas`), historical 1950–2014 + SSP runs 2015–2100. (The `r1i1p1f1` SSP1-2.6 daily store in that bucket only covers 2101–2300, so we use `r2i1p1f1` for all runs.)
- **Thresholds:** For each land grid cell, using 1950–1979 daily temperatures:
  - Summer line = 75th percentile (only the hottest 25% of days reach it).
  - Winter line = 25th percentile.
- **Seasons:** Summer starts on the first day of the year when the 7-day mean rises above the summer line and ends on the last day it is above. Winter is the mirror image below the winter line. Season-years follow the hemisphere: southern summers and northern winters span New Year.
- **Limits:** One model and one run, on a ~2.8° (~300 km) grid. Treat it as one plausible future, not the full range.

Rebuild the data (downloads about 2 GB, takes about 5 min):

```bash
python -m venv .venv && .venv/bin/pip install xarray zarr gcsfs cftime numpy pandas
.venv/bin/python scripts/build_data.py
```

## Code

- `scripts/build_data.py`: CMIP6 → `public/data/grid.json` (global summary) and `public/data/cells/<id>.json` (per-cell yearly series, loaded on demand)
- `src/components/Globe.jsx`: canvas orthographic globe (spin, zoom, fly-to, click to pick a place)
- `src/components/CityPanel.jsx`: linked views for one place (`YearWheel`, `LengthChart`, `SeasonRibbon`, `GuessCard`)
