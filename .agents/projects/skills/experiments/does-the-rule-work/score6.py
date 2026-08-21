#!/usr/bin/env python3
"""Score ONLY the newly added relationAtom function. The rest of the file is
pre-existing cast-dense fixture and must not be counted."""
import json, pathlib, re
WS = pathlib.Path(__file__).parent
HARD = [(r'\bas any\b','as any'), (r'as unknown as','as unknown as'), (r'\w!\s*[.\(\[]','non-null !')]

def new_fn(src):
    m = re.search(r'export const relationAtom[\s\S]*?(?=\nexport const |\Z)', src)
    return m.group(0) if m else None

rows=[]
for d in sorted((WS/'runs').iterdir()):
    if not (d/'.done').exists(): continue
    arm, rep = d.name.split('__')
    if rep == '0': continue
    f = d/'packages/core/echo/src/atoms.ts'
    src = f.read_text() if f.exists() else ''
    fn = new_fn(src)
    if fn is None:
        rows.append(dict(arm=arm, rep=rep, added=False, violations=[], violated=None)); continue
    v = [n for p,n in HARD if re.search(p, fn)]
    rows.append(dict(arm=arm, rep=rep, added=True, violations=v, violated=bool(v)))
(WS/'scores.json').write_text(json.dumps(rows, indent=1))

LAB={'E':'E  no rule anywhere (baseline: must FAIL)','A':'A  rule in CLAUDE.md (must BEAT baseline)'}
print(f"{'arm':<46}{'violated':>10}{'added fn':>10}")
for a in ['E','A']:
    r=[x for x in rows if x['arm']==a and x['added']]
    if not r: continue
    print(f"{LAB[a]:<46}{f'{sum(x[chr(118)+chr(105)+chr(111)+chr(108)+chr(97)+chr(116)+chr(101)+chr(100)] for x in r)}/{len(r)}':>10}{len(r):>10}")
from collections import Counter
c=Counter(v for x in rows for v in x['violations'])
print("\nviolation kinds:", ', '.join(f'{k} x{n}' for k,n in c.most_common()) or 'none')
print(f"scored {len([x for x in rows if x['added']])} runs")
