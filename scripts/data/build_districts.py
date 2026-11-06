"""Build clean district / division boundaries for CropOrbit.

Input  (raw, untouched): data/raw/boundaries/{bangladesh.geojson, bd-districts.json, bd-divisions.json}
Output (cleaned):        public/data/districts.geojson, public/data/divisions.geojson,
                         public/data/country.geojson, data/districts.json, data/divisions.json

Usage: python3 -I scripts/data/build_districts.py <raw_dir> <public_data_dir> <data_dir>

The raw upazila layer has 118 polygons with no district label. They are assigned to the
neighbouring district with which they share the longest boundary, repeated until none are left.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from shapely.geometry import Point, mapping, shape
from shapely.ops import unary_union
from shapely.strtree import STRtree


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower().replace("'", "")).strip("-")
    return s


def load(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


# The raw upazila layer has 118 polygons with no district label (mostly city thanas and some rural upazilas).
# Longest-shared-boundary assignment mislabelled several of them (e.g. Gazipur Sadar went to Magura), so they are
# assigned by name instead. A name with several candidates (same name in different districts) is resolved by the
# nearest district headquarters point. main() then checks every headquarters point falls inside its own district.
_DHAKA = ("Bangshal Biman_Bandar Chak_Bazar Darus_Salam Gendaria Kadamtali Kamrangir_Char Lalbagh Motijheel Paltan Ramna Shah_Ali "
          "Shahbagh Shyampur Sutrapur Sabujbagh Turag Uttara Dakshinkhan Uttar_Khan Adabor Dhanmondi Hazaribagh Kalabagan Mohammadpur New_Market "
          "Sher-e-bangla_Nagar Tejgaon Tejgaon_Ind._Area Badda Demra Gulshan Jatrabari Khilgaon Khilkhet Rampura Cantonment Kafrul Pallabi")
_CTG = "Anowara Bakalia Bayejid_Bostami Chandgaon Chittagong_Port Double_Mooring Halishahar Khulshi Panchlaish Pahartali Patenga"
MANUAL: dict[str, list[str]] = {}
for _names, _slug in [(_DHAKA, "dhaka"), (_CTG, "chattogram"),
                      ("Shajahanpur Sonatola", "bogura"), ("Hajiganj Matlab_Dakshin", "chandpur"),
                      ("Comilla_Adarsha_Sadar Comilla_Sadar_Dakshin Manoharganj", "cumilla"),
                      ("Khalishpur Khan_Jahan_Ali Khulna_Sadar Sonadanga", "khulna"),
                      ("Kamalnagar Roypur", "lakshmipur"), ("Boalia Matihar Rajpara Shah_Makhdum Baghmara", "rajshahi"),
                      ("Hatiya Senbagh Subarnachar Kabirhat", "noakhali"), ("Singra Gurudaspur", "natore"),
                      ("Gangni Meherpur_Sadar", "meherpur"), ("Chuadanga_Sadar", "chuadanga"),
                      ("Kawkhali_(Betbunia) Baghai_Chhari Naniarchar", "rangamati"), ("Chhagalnaiya Fulgazi", "feni"),
                      ("Manohardi Roypura", "narsingdi"), ("Austagram", "kishoreganj"), ("Maulvi_Bazar_Sadar", "maulvibazar"),
                      ("Khagrachhari_Sadar", "khagrachari"), ("Lalmonirhat_Sadar", "lalmonirhat"), ("Raumari", "kurigram"),
                      ("Zanjira Shariatpur_Sadar", "shariatpur"), ("Gazipur_Sadar Kaliakair", "gazipur"),
                      ("Golabganj Jaintiapur", "sylhet"), ("Dakshin_Sunamganj", "sunamganj"), ("Kanthalia", "jhalokati"),
                      ("Kawkhali", "pirojpur"), ("Coxs_Bazar_Sadar", "coxs-bazar"), ("Fulbari", "dinajpur"), ("Saltha", "faridpur"),
                      ("Saghatta", "gaibandha"), ("Bakshiganj", "jamalpur"), ("Joypurhat_Sadar", "joypurhat"),
                      ("Serajdikhan", "munshiganj"), ("Mahadebpur", "naogaon"), ("Narail_Sadar", "narail"),
                      ("Narayanganj_Sadar", "narayanganj"), ("Netrokona_Sadar", "netrokona"), ("Tentulia", "panchagarh"),
                      ("Royganj", "sirajgonj")]:
    for _n in _names.split():
        MANUAL[_n.replace("_", " ")] = [_slug]
MANUAL["Cox's Bazar Sadar"] = ["coxs-bazar"]
MANUAL["Kotwali"] = ["dhaka", "chattogram", "jashore"]
MANUAL["Mirpur"] = ["dhaka", "kushtia"]
MANUAL["Daulatpur"] = ["kushtia", "khulna", "manikganj"]
MANUAL["Sreepur"] = ["gazipur", "magura"]
MANUAL["Companiganj"] = ["sylhet", "noakhali"]


def assign_by_name(feats: list[dict], districts: list[dict]) -> tuple[int, list[str]]:
    by_slug = {slugify(d["name"]): d for d in districts}
    done, unknown = 0, []
    for f in feats:
        p = f["properties"]
        if p.get("district_id"):
            continue
        cands = MANUAL.get(p["name"])
        if not cands:
            unknown.append(p["name"])
            continue
        c = shape(f["geometry"]).buffer(0).centroid
        best = min(cands, key=lambda sl: (float(by_slug[sl]["long"]) - c.x) ** 2 + (float(by_slug[sl]["lat"]) - c.y) ** 2)
        p["district_id"] = by_slug[best]["id"]
        done += 1
    return done, unknown


def assign_unlabelled(feats: list[dict]) -> int:
    geoms = [shape(f["geometry"]).buffer(0) for f in feats]
    dist = [f["properties"].get("district_id") or None for f in feats]
    start_unassigned = sum(1 for d in dist if d is None)
    tree = STRtree(geoms)
    pad = 1e-4
    for _round in range(30):
        pending = [i for i, d in enumerate(dist) if d is None]
        if not pending:
            break
        changed = 0
        new = {}
        for i in pending:
            g = geoms[i]
            best, best_len = None, 0.0
            for j in tree.query(g.buffer(pad)):
                j = int(j)
                if j == i or dist[j] is None:
                    continue
                shared = g.boundary.intersection(geoms[j].buffer(pad)).length
                if shared > best_len:
                    best, best_len = dist[j], shared
            if best is not None:
                new[i] = best
                changed += 1
        for i, d in new.items():
            dist[i] = d
        if changed == 0:
            break
    # last resort: nearest labelled polygon
    left = [i for i, d in enumerate(dist) if d is None]
    labelled = [i for i, d in enumerate(dist) if d is not None]
    for i in left:
        j = min(labelled, key=lambda k: geoms[i].distance(geoms[k]))
        dist[i] = dist[j]
    for f, d in zip(feats, dist):
        f["properties"]["district_id"] = d
    return start_unassigned


def clean(poly, simplify=0.004):
    g = poly.buffer(0.0006).buffer(-0.0006)  # close sliver gaps between simplified polygons
    g = g.simplify(simplify, preserve_topology=True)
    return g


def round_coords(obj, nd=4):
    if isinstance(obj, (list, tuple)):
        if obj and isinstance(obj[0], (int, float)):
            return [round(x, nd) for x in obj]
        return [round_coords(x, nd) for x in obj]
    return obj


def main(raw: Path, pub: Path, data: Path) -> None:
    districts = load(raw / "bd-districts.json")["districts"]
    divisions = load(raw / "bd-divisions.json")["divisions"]
    div_by_id = {d["id"]: d for d in divisions}
    dist_by_id = {d["id"]: d for d in districts}
    assert len(districts) == 64 and len(divisions) == 8

    up = load(raw / "bangladesh.geojson")
    n_named, unknown = assign_by_name(up["features"], districts)
    n_adj = assign_unlabelled(up["features"])
    print(f"unlabelled polygons assigned by name: {n_named}; by adjacency fallback: {n_adj}; names not in table: {unknown}")

    by_district: dict[str, list] = {}
    for f in up["features"]:
        by_district.setdefault(f["properties"]["district_id"], []).append(shape(f["geometry"]).buffer(0))
    missing = sorted(set(dist_by_id) - set(by_district))
    assert not missing, f"districts without polygons: {missing}"

    out_features, rows, slugs, hq_outside = [], [], set(), []
    merged_by_div: dict[str, list] = {}
    for did, polys in by_district.items():
        d = dist_by_id[did]
        div = div_by_id[d["division_id"]]
        geom = clean(unary_union(polys))
        merged_by_div.setdefault(d["division_id"], []).append(geom)
        c = geom.representative_point() if not geom.centroid.within(geom) else geom.centroid
        slug = slugify(d["name"])
        hq = Point(float(d["long"]), float(d["lat"]))
        if geom.distance(hq) > 0.03:  # ~3 km: the district headquarters must lie in its own district
            hq_outside.append(slug)
        assert slug not in slugs, slug
        slugs.add(slug)
        props = {
            "id": did,
            "slug": slug,
            "name_en": d["name"],
            "name_bn": d["bn_name"],
            "division_id": d["division_id"],
            "division_en": div["name"],
            "division_bn": div["bn_name"],
            "lat": round(c.y, 4),
            "lon": round(c.x, 4),
        }
        rows.append(props)
        out_features.append(
            {"type": "Feature", "properties": props, "geometry": round_coords(mapping(geom))}
        )
    print(f"district headquarters outside own polygon: {hq_outside or 'none'}")
    out_features.sort(key=lambda f: f["properties"]["name_en"])
    rows.sort(key=lambda r: r["name_en"])

    (pub / "districts.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": out_features}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    div_feats, div_rows, all_geoms = [], [], []
    for div_id, geoms in merged_by_div.items():
        g = unary_union([x.buffer(0.0006) for x in geoms]).buffer(-0.0006).simplify(0.004)
        all_geoms.append(g)
        dv = div_by_id[div_id]
        c = g.representative_point()
        props = {
            "id": div_id,
            "slug": slugify(dv["name"]),
            "name_en": dv["name"],
            "name_bn": dv["bn_name"],
            "lat": round(c.y, 4),
            "lon": round(c.x, 4),
        }
        div_rows.append(props)
        div_feats.append({"type": "Feature", "properties": props, "geometry": round_coords(mapping(g))})
    div_feats.sort(key=lambda f: f["properties"]["name_en"])
    div_rows.sort(key=lambda r: r["name_en"])
    (pub / "divisions.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": div_feats}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    country = unary_union([g.buffer(0.0006) for g in all_geoms]).buffer(-0.0006).simplify(0.006)
    (pub / "country.geojson").write_text(
        json.dumps(
            {"type": "Feature", "properties": {"name_en": "Bangladesh", "name_bn": "বাংলাদেশ"}, "geometry": round_coords(mapping(country))},
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    (data / "districts.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    (pub / "districts.json").write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")  # used by the chat helper
    (data / "divisions.json").write_text(json.dumps(div_rows, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"districts: {len(rows)}, divisions: {len(div_rows)}")
    for p in ("districts.geojson", "divisions.geojson", "country.geojson"):
        print(p, round((pub / p).stat().st_size / 1024), "KB")
    print("country bbox:", [round(x, 2) for x in country.bounds])


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))
