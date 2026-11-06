# Text for the NASA Space Apps submission form

Paste into the matching fields. The form must be in English. Check every claim against what the team actually did, and update the two links.

**Check before you submit or record the demo:** open any district page on your live site in your own browser and look at the "Live from NASA POWER" panel. If it shows 7-day and 30-day rain totals, the live claims below are true. If it shows the "saved data" message instead, your browser or NASA blocked the request: delete the sentences about the live panel (marked "live" below) and the demo step that shows it. The daily refresh claims do not depend on this panel.

**Project name:** CropOrbit

**Links:** final project: your Netlify link. Code: your public GitHub repository link.

**High-level project summary (short):**
CropOrbit tells farmers and agriculture officers in Bangladesh whether the planting season is moving in their district. For each of the 64 districts it reads the NASA POWER climate record (1981 to the newest published day), tests whether rain timing for Aus and Aman rice has shifted, and says plainly when nothing reliable has changed. It refreshes from NASA every day and also shows the last 30 days live from NASA when a district page is opened.

**Detailed project description:**
Challenge: Field Shift: Adapting Farms with NASA Data. Climate change is moving the rains, but farmers get national averages. CropOrbit gives each district its own answer in Bangla and English.

What it does:
- Rain timing: for each district it finds the day by which a set share of March–September rain has fallen, compares the 14 latest complete years with the 14 before them, and reports a shift only if p < 0.10, the shift is at least 2 days, and the direction also holds in a longer 1981–2003 vs 2004–latest comparison and with stricter and looser thresholds. When nothing reliable changed, it says "keep your usual calendar".
- Heat and cold: temperature trends from 1998 onward (hot days, winter nights, growing-degree days).
- Honest data checks: we measured step changes in the NASA model record around 1997/98 and 2016 (rain about 2.0 and 1.6 times), so we do not draw long trends for rain, soil wetness, humidity or sunlight. With 64 districts, about 6 flags are expected by chance, and the app says so.
- Fresh data: a daily GitHub Action asks NASA POWER for the newest days (no key needed), re-runs the analysis, rebuilds and publishes the site. Each district page also asks NASA POWER directly for the latest days and shows 7-day and 30-day rain totals. The newest day shown is the newest day NASA has released.
- Simulated IoT irrigation demo (clearly labelled simulation): shows how a control centre could use the district's real NASA rain signal to start irrigation automatically. No hardware is used.
- Rule-based chat helper with 20 common crop questions (no AI model).
- Works offline after the first visit.

Limits: POWER is model output (MERRA-2, about 50 km cells), not station data. No crop-yield forecasting is included because no district crop statistics were available.

**NASA data used:**
- NASA POWER daily point API (community AG): PRECTOTCORR, T2M, T2M_MAX, T2M_MIN, RH2M, WS2M, ALLSKY_SFC_SW_DWN, GWETTOP, GWETROOT, 1981 to the newest published day, 45 grid cells covering 64 districts. https://power.larc.nasa.gov
- NASA GIBS Blue Marble Shaded Relief with Bathymetry (globe layer). https://nasa-gibs.github.io/gibs-api-docs/

**Space Agency partner and other data, tools, and resources:**
- Data: geoBoundaries gbOpen ADM3 (CC BY 4.0) via the bangladesh-geojson package (district boundaries); Natural Earth II imagery bundled with CesiumJS.
- Software: Next.js, React, TypeScript, Tailwind CSS, Recharts, Zustand, CesiumJS, Vitest, ESLint; Python with numpy, scipy, pandas, shapely, pytest; fonts Anek Bangla, Newsreader, Noto Serif Bengali via Fontsource.
- Hosting and automation: Netlify, GitHub Actions.
- Licence: code under Apache-2.0.

**AI use disclosure:**
Generative AI (Claude, by Anthropic) was used to write most of the website and data-processing code and to draft documentation and interface text. The team reviewed and tested the output. No AI-generated images, video or audio are used. The project uses no machine-learning models: the analysis is statistical (Mann-Whitney and Sen-slope tests) and the chat helper and irrigation logic are rule-based. NASA values are used as downloaded and processed by deterministic code. Bangla text was drafted with AI help [and has / has not yet been proofread by a native speaker: choose one].

## Demo (required): pick one
**A. Video, up to 30 seconds, English subtitles.** Suggested script:
1. (0–5 s) Home page, globe turning: "Is your district's planting season moving? CropOrbit answers with NASA data."
2. (5–13 s) Open Lalmonirhat, Planting window: "Aman rain timing has moved about 8 days earlier here."
3. (13–19 s) Open Rajshahi: "Here nothing reliable changed, and the app says so."
4. (19–26 s) Show the footer date and the "Live from NASA POWER" panel: "Data refreshes from NASA every day."
5. (26–30 s) Field control, Start demo: "A simulated IoT irrigation loop uses the real NASA rain signal."

**B. Slide deck, up to 7 slides, English:** 1 Problem, 2 What CropOrbit does, 3 NASA data and daily refresh, 4 Planting-window result (Lalmonirhat vs Rajshahi), 5 Honest checks and limits, 6 Simulated IoT demo, 7 Links, licence, AI use. Host it with a public link that needs no sign-in.
