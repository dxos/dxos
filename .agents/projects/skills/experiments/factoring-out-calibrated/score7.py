#!/usr/bin/env python3
import json, pathlib, re
from collections import defaultdict
WS = pathlib.Path(__file__).parent
HARD = [r'\bas any\b', r'as unknown as', r'\w!\s*[.\(\[]']
rows=[]
for d in sorted((WS/'runs').iterdir()):
    if not (d/'.done').exists(): continue
    dens, arm, rep = d.name.split('__')
    f = d/'packages/core/echo/src/atoms.ts'
    if not f.exists(): continue
    m = re.search(r'export const relationAtom[\s\S]*?(?=\nexport const |\Z)', f.read_text())
    if not m: continue
    fn = m.group(0)
    fired = []
    fj = d/'.fired.json'
    if fj.exists():
        try: fired = json.loads(fj.read_text()).get('fired', [])
        except Exception: pass
    rows.append(dict(density=int(dens[1:]), arm=arm, rep=rep,
                     violated=any(re.search(p, fn) for p in HARD),
                     skill_fired='type-friction' in fired))
(WS/'scores.json').write_text(json.dumps(rows, indent=1))
tab=defaultdict(lambda: defaultdict(list))
for r in rows: tab[r['density']][r['arm']].append(r['violated'])
print(f"{'cast density':<16}{'E (no rule)':>14}{'A (CLAUDE.md)':>16}{'B (skill)':>12}{'B fired':>10}   separation")
for dens in sorted(tab):
    e, a, b = tab[dens].get('E',[]), tab[dens].get('A',[]), tab[dens].get('B',[])
    es = f"{sum(e)}/{len(e)}" if e else '-'
    as_ = f"{sum(a)}/{len(a)}" if a else '-'
    bs = f"{sum(b)}/{len(b)}" if b else '-'
    bf = f"{sum(1 for r in rows if r['density']==dens and r['arm']=='B' and r['skill_fired'])}/{len(b)}" if b else '-'
    band = ''
    if e and a:
        er, ar = sum(e)/len(e), sum(a)/len(a)
        gap = er - ar
        # What matters is SEPARATION between E and A. E=100%/A=0% is the ideal
        # operating point, not a problem: it gives B an unambiguous target.
        # Only E ~= A is useless, since B then has no gap to sit in.
        band = f'gap {gap:+.0%} ' + ('USABLE' if gap >= 0.4 else 'no separation')
    print(f"{f'{dens}/3 neighbours':<16}{es:>14}{as_:>16}{bs:>12}{bf:>10}   {band}")
print(f"\nscored {len(rows)}")
