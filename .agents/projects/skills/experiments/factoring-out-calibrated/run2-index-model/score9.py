#!/usr/bin/env python3
import json, pathlib, re
from collections import defaultdict
WS = pathlib.Path(__file__).parent
HARD = [r'\bas any\b', r'as unknown as', r'\w!\s*[.\(\[]']
rows=[]
for d in sorted((WS/'runs').iterdir()):
    if not (d/'.done').exists(): continue
    arm, rep = d.name.split('__')
    f = d/'packages/core/echo/src/atoms.ts'
    if not f.exists(): continue
    m = re.search(r'export const relationAtom[\s\S]*?(?=\nexport const |\Z)', f.read_text())
    if not m: continue
    fired=[]
    if (d/'.fired.json').exists():
        try: fired=json.loads((d/'.fired.json').read_text()).get('fired',[])
        except Exception: pass
    rows.append(dict(arm=arm, rep=rep, violated=any(re.search(p, m.group(0)) for p in HARD),
                     fired='code-style' in fired))
(WS/'scores.json').write_text(json.dumps(rows, indent=1))
LAB={'C':'C  index pointer + general skill','D':'D  general skill only, no pointer'}
print(f"{'arm':<38}{'violated':>10}{'skill fired':>13}")
for a in ['C','D']:
    r=[x for x in rows if x['arm']==a]
    if not r: continue
    print(f"{LAB[a]:<38}{f'{sum(x[chr(118)+chr(105)+chr(111)+chr(108)+chr(97)+chr(116)+chr(101)+chr(100)] for x in r)}/{len(r)}':>10}{f'{sum(x[chr(102)+chr(105)+chr(114)+chr(101)+chr(100)] for x in r)}/{len(r)}':>13}")
print("\nreference (same fixture, same task):")
print("  E  no rule anywhere                        8/8      -")
print("  A  full rule inline in CLAUDE.md           3/10     -")
print("  B  scenario-scoped skill, no pointer       8/8    0/8")
print(f"\nscored {len(rows)}")
