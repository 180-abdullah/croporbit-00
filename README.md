# CropOrbit

**Is your district's planting season moving?** Pick any of Bangladesh's 64 districts and CropOrbit reads the NASA climate record for that place. It says plainly whether rain timing has shifted for Aus and Aman rice, and says just as plainly when nothing reliable has changed.

NASA Space Apps Challenge 2026, challenge 7 *Field Shift: Adapting Farms with NASA Data*. Team FARMONAUTS. **This is a demo build.**

## Try it in three minutes
1. Open the home page. Turn the 3D globe, or type a district (typos are tolerated, Bangla or English).
2. Open **Lalmonirhat**, then **Planting window**. Aman rain timing has moved about 8 days earlier, and the page shows the chart, the checks and the SMS text.
3. Open **Rajshahi**: no reliable rain shift, and the page says to keep the usual calendar.
4. Open **Field control** and press **Start demo**: the simulated IoT loop (sensors → radio gateway → control centre → pump → farmer SMS). The control centre uses the district's real NASA rain signal: if the last 30 days were dry it starts irrigating earlier and sends PUMP ON automatically. Below it, test the controller by hand with six scenarios.
5. Press the green **chat button** (bottom right): 20 common crop questions in Bangla and English, free-text search, and on a district page a summary of what NASA data says for that district. Rule-based, no AI.
6. The site opens in English. Switch to Bangla with the button at the top right (your choice is remembered in this browser). Everything works offline after the first visit (static site plus a small service worker).

## What is real and what is not
| Page | Status |
|---|---|
| Dashboard, planting window, environmental analysis | **NASA model-derived**: NASA POWER daily record from 1981 to the newest published day (shown in the page footer), processed by tested code in `scripts/compute/` |
| "Live from NASA POWER" panel on each district page | **Live**: the browser asks NASA POWER directly for the latest days (no key) and shows 7-day and 30-day rain totals. If NASA cannot be reached it says so and the page shows the last saved update |
| Field control and IoT demo | **Simulated**: no hardware, seeded random walk, demo thresholds; only the NASA rain signal is real |
| Chat helper | **Rule-based**: 20 fixed answers; general guidance that points to the Upazila Agriculture Office / call centre 16123 |
| Historical crops, crop forecast | **Unavailable**: no district crop statistics are loaded, so no numbers are invented |

## Honest limits
- POWER starts on **1 January 1981**; data before that does not exist in this source.
- POWER weather is MERRA-2 reanalysis (about 50 km cells), not station observation. 64 districts share 45 cells.
- We measured **step changes** in the model around 1997/98 and 2016: yearly rain after 1998 is about 2.0 times the level before, about 1.6 times again after 2016, and temperature drops about 1 degree C at 1998 (`data/metadata/data-quality.json`). The cause is not confirmed. Therefore temperature trends use 1998 onward only, and no long trend is drawn for rain, soil wetness, humidity or sunlight.
- A planting shift is reported only if p < 0.10, at least 2 days, and the direction also holds for a longer 1981–2003 vs 2004–latest comparison and for stricter and looser rain thresholds. The two main periods are the 14 latest complete years and the 14 before them (1998–2011 vs 2012–2025 today), and they move forward by themselves each year. Even so, with 64 districts about 6 flags are expected by chance; 4 Aman and 0 Aus districts are flagged, close to chance. The UI says so.
- Boundary check: district areas from the polygons match official figures within 25% for 61 of 64 districts (median error 2%). The three outliers are coastal districts (Bhola, Noakhali, Barguna) whose official area includes river and estuary water that land polygons leave out.
- No machine learning. Advice is a signal to check with a local agriculture officer.

## Run it
```bash
npm install
npm test            # controller tests
npm run dev         # http://localhost:3000
npm run build       # static site in out/  (set NEXT_PUBLIC_BASE_PATH=/croporbit for GitHub Pages)
```
Rebuild the data (optional; outputs are committed):
```bash
pip install -r requirements.txt
python3 -I scripts/data/build_districts.py data/raw/boundaries public/data data
python3 -I scripts/data/fetch_power.py data/districts.json data/raw/power data/geo data/metadata           # first full download (slow, polite to the API)
python3 -I scripts/data/fetch_power.py --update data/districts.json data/raw/power data/geo data/metadata  # later: only the newest days
python3 -I scripts/compute/analyze.py data/districts.json data/geo/district-cells.json data/raw/power public/data/climate data/metadata
python3 -I scripts/compute/data_quality.py data/geo/district-cells.json data/raw/power data/metadata/data-quality.json
python3 -m pytest -q tests
```

## Keeping the data fresh
`.github/workflows/refresh.yml` runs every day. It asks the NASA POWER daily point API (no API key needed) only for the newest days, re-requesting the last 120 days because NASA revises its newest values, re-runs the analysis, rebuilds the site and publishes it to GitHub Pages. If NASA cannot be reached or the data is stale, the job stops before publishing and the live site keeps the previous version. Setup (one setting) is in [`docs/DEPLOY.md`](docs/DEPLOY.md). POWER publishes new days with a lag of a few days, so "newest day" means newest day NASA has released; the date is shown in the footer.

## Sources and tools
**NASA data**
- NASA POWER (Prediction Of Worldwide Energy Resources), daily point API, community AG, MERRA-2 based parameters PRECTOTCORR, T2M, T2M_MAX, T2M_MIN, RH2M, WS2M, ALLSKY_SFC_SW_DWN, GWETTOP, GWETROOT. https://power.larc.nasa.gov/docs/services/api/temporal/daily/
- NASA GIBS (Global Imagery Browse Services), Blue Marble Shaded Relief with Bathymetry, optional online layer on the globe. https://nasa-gibs.github.io/gibs-api-docs/

**Other data**
- District boundaries: geoBoundaries gbOpen ADM3 (CC BY 4.0) via the `bangladesh-geojson` npm package (code MIT, data ODbL), merged to 64 districts; see `data/raw/boundaries/SOURCE.md`.
- Natural Earth II raster imagery (public domain), bundled with CesiumJS, used as the offline globe base layer.

**Software (open source)**
- Next.js, React, TypeScript, Tailwind CSS, Recharts, Zustand, Vitest, ESLint.
- CesiumJS (Apache-2.0) for the 3D globe.
- Python: numpy, scipy, pandas, shapely, pytest for the analysis and tests.
- Fonts: Anek Bangla, Newsreader, Noto Serif Bengali (SIL OFL) via Fontsource.
- Hosting and automation: GitHub Pages and GitHub Actions.

**AI assistance:** Claude (Anthropic); see [`docs/AI_USE.md`](docs/AI_USE.md). Text for the Space Apps submission form is in [`docs/SUBMISSION.md`](docs/SUBMISSION.md).

## Deploy free
Step-by-step guide: [`docs/DEPLOY.md`](docs/DEPLOY.md). The site is published by GitHub Pages through the daily refresh job.

## License and AI use
Code: Apache-2.0 (`LICENSE`). AI assistance is disclosed in [`docs/AI_USE.md`](docs/AI_USE.md). Bangla text should be proofread by a native speaker before wider release.
