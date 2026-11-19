"""
Build season-shift data for the "Your Climate, Your Future" prototype.

Source: NOAA / Google Cloud Public CMIP6 dataset (gs://cmip6, Pangeo zarr stores)
Model:  CanESM5 r2i1p1f1, daily near-surface air temperature (tas)
Runs:   historical (1950-2014) + SSP1-2.6, SSP2-4.5, SSP5-8.5 (2015-2100)

Method (per land grid cell):
  * Baseline = 1950-1979 daily tas.
      summer threshold = 75th percentile of baseline days (only the hottest 25% reach it)
      winter threshold = 25th percentile of baseline days (only the coldest 25% fall below it)
  * Daily tas is smoothed with a 7-day centred running mean so one freak day does not
    open or close a season.
  * Summer start = first day of the season-year the smoothed temp is above the summer line,
    summer end = last day above it. Winter is the mirror image (below the winter line).
  * Season-years follow the hemisphere: in the north, summer is read Jan 1 - Dec 31 and winter
    Jul 1 (previous year) - Jun 30; in the south it is the other way around.
  * Start/end are stored as day offsets from Jan 1 of the labelled year (365-day "noleap"
    model calendar). Negative = previous calendar year (e.g. -40 = Nov 22).

Outputs (in public/data/):
  grid.json            every land cell + 20-year summary of season lengths per scenario
  cells/<id>.json      full yearly series for one cell (loaded on click)

Run:  ../.venv/bin/python scripts/build_data.py     (from climate-future/)
"""

import json
import os
import sys
import warnings

import numpy as np
import xarray as xr

warnings.filterwarnings("ignore")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "data")
CACHE = os.path.join(ROOT, "scripts", ".cache")
os.makedirs(os.path.join(OUT, "cells"), exist_ok=True)
os.makedirs(CACHE, exist_ok=True)

BASE = "gs://cmip6/CMIP6/{mip}/CCCma/CanESM5/{exp}/{member}/{table}/{var}/gn/v20190429/"
# r1i1p1f1's SSP1-2.6 daily store on gs://cmip6 only covers 2101-2300, so we use r2i1p1f1,
# which has complete historical + all three SSP runs through 2100.
MEMBER = "r2i1p1f1"
SCENARIOS = ["ssp126", "ssp245", "ssp585"]
HIST_YEARS = (1950, 2014)
FUT_YEARS = (2015, 2100)
BASELINE = (1950, 1979)
SMOOTH = 7
LAND_MIN = 0.3  # keep cells at least 30% land (so coastal cities still map to a cell)


def open_store(mip, exp, table="day", var="tas"):
    return xr.open_zarr(
        BASE.format(mip=mip, exp=exp, member=MEMBER if table == "day" else "r1i1p1f1", table=table, var=var),
        consolidated=True,
        storage_options={"token": "anon"},
        use_cftime=True,
    )


def land_cells():
    ds = open_store("CMIP", "historical", "fx", "sftlf")
    frac = ds.sftlf.values / 100.0
    lat, lon = ds.lat.values, ds.lon.values
    jj, ii = np.where(frac >= LAND_MIN)
    keep = lat[jj] > -60  # drop Antarctica
    return lat, lon, jj[keep], ii[keep], frac[jj[keep], ii[keep]]


def fetch(mip, exp, years, jj, ii):
    """Return (days, cells) float32 °C for land cells, cached on disk."""
    path = os.path.join(CACHE, f"{MEMBER}_{exp}_{years[0]}_{years[1]}.npy")
    if os.path.exists(path):
        return np.load(path)
    ds = open_store(mip, exp)
    t = ds.time.dt.year.values
    idx = np.where((t >= years[0]) & (t <= years[1]))[0]
    chunk = ds.tas.encoding["chunks"][0]
    out = np.empty((idx.size, jj.size), dtype=np.float32)
    i0, i1 = int(idx[0]), int(idx[-1]) + 1
    a = i0
    while a < i1:
        b = min((a // chunk + 1) * chunk, i1)  # stop at the next zarr chunk boundary
        block = ds.tas.isel(time=slice(a, b)).values  # (t, lat, lon) Kelvin
        out[a - i0 : b - i0] = block[:, jj, ii] - 273.15
        print(f"  {exp}: {b - i0}/{idx.size} days", flush=True)
        a = b
    assert out.shape[0] == (years[1] - years[0] + 1) * 365, "expected noleap calendar"
    np.save(path, out)
    return out


def smooth(x, w=SMOOTH):
    c = np.cumsum(np.pad(x, ((w // 2, w - 1 - w // 2), (0, 0)), mode="edge"), axis=0, dtype=np.float64)
    c = np.vstack([np.zeros((1, x.shape[1])), c])
    return ((c[w:] - c[:-w]) / w).astype(np.float32)


def season_bounds(flags, y0, years, offset):
    """
    flags: (days, cells) bool, day 0 = Jan 1 of y0.
    For each labelled year Y, scan the 365-day window starting at Jan 1 Y + offset.
    Returns start, end (offset from Jan 1 Y) and days-in-season, each (len(years), cells).
    """
    n_cells = flags.shape[1]
    start = np.full((len(years), n_cells), np.nan, dtype=np.float32)
    end = np.full_like(start, np.nan)
    count = np.zeros_like(start)
    for k, Y in enumerate(years):
        a = (Y - y0) * 365 + offset
        if a < 0 or a + 365 > flags.shape[0]:
            continue
        win = flags[a : a + 365]
        any_ = win.any(axis=0)
        first = win.argmax(axis=0)
        last = 364 - win[::-1].argmax(axis=0)
        start[k, any_] = first[any_] + offset
        end[k, any_] = last[any_] + offset
        count[k] = win.sum(axis=0)
    return start, end, count


def main():
    lat, lon, jj, ii, frac = land_cells()
    clat, clon = lat[jj], np.where(lon[ii] > 180, lon[ii] - 360, lon[ii])
    north = clat >= 0
    print(f"{jj.size} land cells")

    hist = fetch("CMIP", "historical", HIST_YEARS, jj, ii)
    b = hist[: (BASELINE[1] - BASELINE[0] + 1) * 365]
    hot = np.percentile(b, 75, axis=0).astype(np.float32)
    cold = np.percentile(b, 25, axis=0).astype(np.float32)

    years = np.arange(HIST_YEARS[0], FUT_YEARS[1] + 1)
    series = {}
    for scen in SCENARIOS:
        fut = fetch("ScenarioMIP", scen, FUT_YEARS, jj, ii)
        full = smooth(np.vstack([hist, fut]))
        above, below = full > hot, full < cold
        # northern hemisphere: summer Jan-Dec, winter Jul(prev)-Jun ; southern: swapped
        s_cal = season_bounds(above, years[0], years, 0)
        s_off = season_bounds(above, years[0], years, -184)
        w_cal = season_bounds(below, years[0], years, 0)
        w_off = season_bounds(below, years[0], years, -184)
        pick = lambda cal, off: tuple(np.where(north, c, o) for c, o in zip(cal, off))
        summer, winter = pick(s_cal, s_off), pick(w_off, w_cal)
        raw = np.vstack([hist, fut])
        tmean = raw.reshape(len(years), 365, -1).mean(axis=1)
        series[scen] = dict(summer=summer, winter=winter, tmean=tmean)

    def length(se):
        s, e, _ = se
        return np.where(np.isnan(s), 0, e - s + 1)

    def window_mean(arr, y0, y1):
        m = (years >= y0) & (years <= y1)
        return np.nanmean(arr[m], axis=0)

    windows = [(2021, 2040), (2041, 2060), (2061, 2080), (2081, 2100)]
    cells = []
    for c in range(jj.size):
        cells.append(dict(id=int(c), lat=round(float(clat[c]), 2), lon=round(float(clon[c]), 2)))

    summary = {"baseline": {}, "windows": [f"{a}-{b}" for a, b in windows]}
    ref = series["ssp245"]  # historical part is identical across scenarios
    summary["baseline"]["summer"] = np.round(window_mean(length(ref["summer"]), *BASELINE)).astype(int).tolist()
    summary["baseline"]["winter"] = np.round(window_mean(length(ref["winter"]), *BASELINE)).astype(int).tolist()
    for scen in SCENARIOS:
        summary[scen] = {
            k: [np.round(window_mean(length(series[scen][k]), a, b)).astype(int).tolist() for a, b in windows]
            for k in ("summer", "winter")
        }
        summary[scen]["tmean"] = [
            np.round(window_mean(series[scen]["tmean"], a, b) - window_mean(series[scen]["tmean"], *BASELINE), 2).tolist()
            for a, b in windows
        ]

    grid = dict(
        source="NOAA/Google Cloud Public CMIP6 (gs://cmip6) - CanESM5 r2i1p1f1 daily tas",
        years=[int(years[0]), int(years[-1])],
        baseline=list(BASELINE),
        dlat=float(abs(lat[1] - lat[0])),
        dlon=float(abs(lon[1] - lon[0])),
        cells=cells,
        summary=summary,
    )
    with open(os.path.join(OUT, "grid.json"), "w") as f:
        json.dump(grid, f, separators=(",", ":"))

    def ints(a):
        return [None if np.isnan(v) else int(v) for v in a]

    hist_n = HIST_YEARS[1] - years[0] + 1
    for c in range(jj.size):
        d = dict(
            id=c, lat=cells[c]["lat"], lon=cells[c]["lon"], north=bool(north[c]),
            land=round(float(frac[c]), 2),
            hot=round(float(hot[c]), 1), cold=round(float(cold[c]), 1),
            years=[int(years[0]), int(years[-1])],
            histEnd=HIST_YEARS[1],
        )
        for scen in SCENARIOS:
            s = series[scen]
            d[scen] = dict(
                ss=ints(s["summer"][0][:, c]), se=ints(s["summer"][1][:, c]), sd=ints(s["summer"][2][:, c]),
                ws=ints(s["winter"][0][:, c]), we=ints(s["winter"][1][:, c]), wd=ints(s["winter"][2][:, c]),
                t=[round(float(v), 2) for v in s["tmean"][:, c]],
            )
        with open(os.path.join(OUT, "cells", f"{c}.json"), "w") as f:
            json.dump(d, f, separators=(",", ":"))
    print("done:", jj.size, "cells; hist rows", hist_n)


if __name__ == "__main__":
    sys.exit(main())
