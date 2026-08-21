#!/usr/bin/env python3
import json, pathlib, statistics as st
WS = pathlib.Path(__file__).parent
rows = json.loads((WS/'scores.json').read_text())
rows = [r for r in rows if not r['empty']]
ARMS = ['E','A','B','C','D']
LABEL = {'E':'E  control (no rule)','A':'A  ours, always-loaded + diluted',
         'B':'B  ours always-loaded + theirs on-demand','C':'C  theirs, on-demand only',
         'D':'D  ours, re-injected last'}
tasks = sorted({r['task'] for r in rows})
print(f"{'arm':<42}{'violation rate':>16}{'n':>5}   per-task (violations/n)")
overall = {}
for a in ARMS:
    ra = [r for r in rows if r['arm']==a]
    if not ra: continue
    v = sum(r['violated'] for r in ra); n = len(ra)
    overall[a] = v/n
    per = '  '.join(f"{t.split('-')[0][0]}{t[-1]}:{sum(r['violated'] for r in ra if r['task']==t)}/{len([r for r in ra if r['task']==t])}" for t in tasks)
    print(f"{LABEL[a]:<42}{v/n:>15.0%}{n:>5}   {per}")
print()
print("by violation class:")
CLASS = {'cast-a':'cast','cast-b':'cast','shim-a':'shim','shim-b':'shim','err-a':'err'}
for cls in ['cast','shim','err']:
    line = f"  {cls:<6}"
    for a in ARMS:
        ra = [r for r in rows if r['arm']==a and CLASS[r['task']]==cls]
        line += f"  {a}:{sum(r['violated'] for r in ra)}/{len(ra)}" if ra else f"  {a}:-"
    print(line)
print()
from collections import Counter
c = Counter(v for r in rows for v in r['violations'])
print("most common violations:", ', '.join(f"{k} x{n}" for k,n in c.most_common(8)))
