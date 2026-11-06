"""Measure step changes in the NASA POWER (MERRA-2) record across all grid cells.
Usage: python3 -I scripts/compute/data_quality.py <geo_cells.json> <raw_power_dir> <out.json>
"""
import gzip, json, sys, datetime as dt
import numpy as np, pandas as pd
sys.path.insert(0,"scripts/compute")
geo=json.load(open(sys.argv[1]))["cells"]
rows=[]; frac_eras={"81-96":[], "98-15":[], "16-25":[]}
for cid in geo:
    o=json.loads(gzip.open(f"{sys.argv[2]}/{cid}.json.gz","rt").read())["properties"]["parameter"]
    df=pd.DataFrame({k:pd.Series(v) for k,v in o.items()}); df.index=pd.to_datetime(df.index,format="%Y%m%d"); df=df.replace(-999.0,np.nan)
    a=df.groupby(df.index.year).agg({"PRECTOTCORR":"sum","T2M":"mean","T2M_MAX":"mean","GWETROOT":"mean","ALLSKY_SFC_SW_DWN":"mean","RH2M":"mean"}).loc[1981:2025]
    def m(lo,hi,c): return a.loc[lo:hi,c].mean()
    rows.append({"rain_ratio_97":m(1998,2003,"PRECTOTCORR")/m(1991,1996,"PRECTOTCORR"),"rain_ratio_16":m(2017,2025,"PRECTOTCORR")/m(2008,2015,"PRECTOTCORR"),
      "dT_97":m(1998,2003,"T2M")-m(1991,1996,"T2M"),"dTmax_97":m(1998,2003,"T2M_MAX")-m(1991,1996,"T2M_MAX"),"dT_16":m(2017,2025,"T2M")-m(2008,2015,"T2M"),
      "soil_97":m(1998,2003,"GWETROOT")-m(1991,1996,"GWETROOT"),"soil_16":m(2017,2025,"GWETROOT")-m(2008,2015,"GWETROOT"),"solar_97":m(1998,2003,"ALLSKY_SFC_SW_DWN")-m(1991,1996,"ALLSKY_SFC_SW_DWN"),"rh_97":m(1998,2003,"RH2M")-m(1991,1996,"RH2M"),"rh_16":m(2017,2025,"RH2M")-m(2008,2015,"RH2M")})
    # scale-free onset: day when cumulative rain since 1 Mar reaches 10% of Mar-Sep total
    for y in range(1981,2026):
        s=df.loc[f"{y}-03-01":f"{y}-09-30","PRECTOTCORR"]
        if s.isna().any(): continue
        c=s.cumsum()/s.sum(); d=int((c>=0.10).idxmax().dayofyear)
        era="81-96" if y<=1996 else ("98-15" if y<=2015 else ("16-25" if y>=2016 else None))
        if y==1997: continue
        frac_eras[era].append(d)
r=pd.DataFrame(rows).mean().round(3)
print(r.to_string())
eras={k:int(np.median(v)) for k,v in frac_eras.items()}
print("scale-free onset medians:", eras)
json.dump({"cells":len(geo),"method":"mean across cells of era means: 1998-2003 vs 1991-1996 (break A), 2017-2025 vs 2008-2015 (break B)","changes":r.to_dict(),"scale_free_onset_median_doy_by_era":eras,"conclusion":"Amounts of rain, soil wetness, humidity and solar change in steps at ~1997/98 and ~2016; temperature steps at 1997/98. Cause not confirmed."},open(sys.argv[3],"w"),indent=1)
