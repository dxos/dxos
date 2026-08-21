#!/usr/bin/env python3
import json, pathlib
from collections import defaultdict
WS = pathlib.Path(__file__).parent
rows=[r for r in json.loads((WS/'scores.json').read_text()) if not r['empty']]
ARMS=['E','A','C','D']
LAB={'E':'E  control (no rule)','A':'A  ours, always-loaded (turn 0)',
     'C':'C  theirs, principle skill at point of need','D':'D  ours, re-injected every turn'}
tasks=sorted({r['task'] for r in rows})
print(f"{'arm':<46}{'runs w/ violation':>19}{'bad sites / sites':>20}")
for a in ARMS:
    ra=[r for r in rows if r['arm']==a]
    if not ra: continue
    rv=sum(r['violated'] for r in ra); bs=sum(r['bad_sites'] for r in ra); ss=sum(r['sites'] for r in ra)
    print(f"{LAB[a]:<46}{f'{rv}/{len(ra)}':>19}{f'{bs}/{ss} ({bs/ss:.0%})':>20}")
print()
print(f"{'task':<16}" + ''.join(f'{a:>16}' for a in ARMS))
for t in tasks:
    line=f"{t:<16}"
    for a in ARMS:
        ra=[r for r in rows if r['arm']==a and r['task']==t]
        line += f"{(str(sum(r['bad_sites'] for r in ra))+'/'+str(sum(r['sites'] for r in ra))) if ra else '-':>16}"
    print(line)
r1=[r for r in rows if r['task']=='r1-expensive']
if r1:
    print("\nr1 secondary: fixed the type at its source (the expensive correct fix)")
    for a in ARMS:
        ra=[r for r in r1 if r['arm']==a]
        if ra: print(f"  {a}: {sum(r.get('fixed_at_source',False) for r in ra)}/{len(ra)}")
r3=[r for r in rows if r['task']=='r3-bulk']
if r3:
    print("\nr3 secondary: sites declined rather than cast (out of 12/run)")
    for a in ARMS:
        ra=[r for r in r3 if r['arm']==a]
        if ra: print(f"  {a}: declined {sum(r.get('declined_sites',0) for r in ra)}, cast {sum(r['bad_sites'] for r in ra)}, n={len(ra)}")
