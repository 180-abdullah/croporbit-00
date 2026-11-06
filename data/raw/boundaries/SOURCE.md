# Raw boundary source (unchanged copies)

- Package: `bangladesh-geojson` v1.0.0 on npm (https://www.npmjs.com/package/bangladesh-geojson), MIT (code) and ODbL (data, see LICENSE-DATA).
- Upazila polygons inside: geoBoundaries gbOpen Bangladesh ADM3 (simplified), CC BY 4.0,
  https://www.geoboundaries.org/ , underlying data: Bangladesh Bureau of Statistics (BBS) / OCHA ROAP.
- District and division names (English + Bangla) and reference coordinates: from the same package.
- Retrieved: 2026-11-04. Files here are byte-for-byte copies; cleaned output goes to `public/data/`.
- Note: 118 of 544 polygons arrive without a district label; `scripts/data/build_districts.py` assigns them by shared boundary and reports how many it assigned.
