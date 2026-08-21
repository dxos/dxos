#!/usr/bin/env python3
import json, pathlib
from collections import defaultdict
WS = pathlib.Path(__file__).parent
cases = json.loads((WS/'cases.json').read_text())
res = defaultdict(list)
for f in (WS/'runs').glob('case*__r*.json'):
    idx = int(f.stem.split('__')[0][4:])
    try: res[idx].append(json.loads(f.read_text())['fired'])
    except Exception: pass

pos = [(i,c) for i,c in enumerate(cases) if c['expect']]
neg = [(i,c) for i,c in enumerate(cases) if not c['expect']]
per_skill = defaultdict(lambda: [0,0])
misfires = defaultdict(int)
rows=[]
for i,c in pos:
    runs = res.get(i,[])
    if not runs: continue
    hit = sum(1 for f in runs if c['expect'] in f)
    per_skill[c['expect']][0]+=hit; per_skill[c['expect']][1]+=len(runs)
    other = [s for f in runs for s in f if s!=c['expect']]
    for s in other: misfires[s]+=1
    rows.append((c['expect'], hit, len(runs), sorted(set(other))))

tot_h=sum(r[1] for r in rows); tot_n=sum(r[2] for r in rows)
print(f"POSITIVE CASES: expected skill fired in {tot_h}/{tot_n} runs ({tot_h/tot_n:.0%})\n")
print(f"{'skill':<34}{'fired':>8}   also fired")
for sk,(h,n) in sorted(per_skill.items(), key=lambda kv:(kv[1][0]/kv[1][1], kv[0])):
    others = sorted({o for s,_,_,os_ in rows if s==sk for o in os_})
    print(f"{sk:<34}{f'{h}/{n}':>8}   {', '.join(others) if others else ''}")
print()
print("NEGATIVE CASES (nothing should fire):")
for i,c in neg:
    runs = res.get(i,[])
    fired = [s for f in runs for s in f]
    print(f"  {'CLEAN' if not fired else 'FIRED ' + ','.join(sorted(set(fired)))}  <- {c['prompt'][:62]}")
