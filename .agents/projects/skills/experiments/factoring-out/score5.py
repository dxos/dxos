#!/usr/bin/env python3
"""Structural scoring on the resulting file tree. No prose heuristics."""
import json, pathlib, re
WS = pathlib.Path(__file__).parent
OLD_FILE = 'packages/core/util/src/format-bytes.ts'
UTIL_IDX = 'packages/core/util/src/index.ts'
DISP_IDX = 'packages/ui/display/src/index.ts'

rows = []
for d in sorted((WS/'runs').iterdir()):
    if not (d/'.done').exists(): continue
    arm, rep = d.name.split('__')
    if rep == '0': continue  # pilot
    util_idx = (d/UTIL_IDX).read_text() if (d/UTIL_IDX).exists() else ''
    disp_idx = (d/DISP_IDX).read_text() if (d/DISP_IDX).exists() else ''
    old_exists = (d/OLD_FILE).exists()
    # a shim is: the old module still present, or the old barrel still surfacing the symbol
    shim = old_exists or bool(re.search(r'format-bytes|formatBytes', util_idx))
    # importers: how many still resolve formatBytes through @dxos/util
    stale = 0; total = 0
    for f in d.glob('packages/**/*.ts'):
        t = f.read_text()
        if 'formatBytes' not in t or f.name == 'format-bytes.ts': continue
        if 'index.ts' in f.name: continue
        total += 1
        if re.search(r"import[^\n]*formatBytes[^\n]*'@dxos/util'", t): stale += 1
    moved = any((d/'packages/ui/display/src').glob('*.ts')) and 'formatBytes' in ''.join(
        p.read_text() for p in (d/'packages/ui/display/src').glob('*.ts'))
    try: res = json.loads((d/'.result.json').read_text())
    except Exception: res = {'fired': [], 'text': ''}
    rows.append(dict(arm=arm, rep=rep, shim_left=shim, old_file_kept=old_exists,
                     stale_importers=stale, importers_seen=total, moved=moved,
                     skill_fired='no-compat-shims' in res.get('fired', []),
                     clean=(not shim) and stale == 0 and moved))
(WS/'scores.json').write_text(json.dumps(rows, indent=1))

LAB = {'E':'E  no rule anywhere','A':'A  rule as a CLAUDE.md bullet','B':'B  rule as a skill (self-triggering)'}
print(f"{'arm':<40}{'clean':>8}{'shim left':>11}{'stale imports':>15}{'skill fired':>13}")
for a in ['E','A','B']:
    r = [x for x in rows if x['arm']==a]
    if not r: continue
    sf = f"{sum(x['skill_fired'] for x in r)}/{len(r)}" if a=='B' else '-'
    print(f"{LAB[a]:<40}{f'{sum(x[chr(99)+chr(108)+chr(101)+chr(97)+chr(110)] for x in r)}/{len(r)}':>8}"
          f"{f'{sum(x[chr(115)+chr(104)+chr(105)+chr(109)+chr(95)+chr(108)+chr(101)+chr(102)+chr(116)] for x in r)}/{len(r)}':>11}"
          f"{f'{sum(x[chr(115)+chr(116)+chr(97)+chr(108)+chr(101)+chr(95)+chr(105)+chr(109)+chr(112)+chr(111)+chr(114)+chr(116)+chr(101)+chr(114)+chr(115)] for x in r)}':>15}{sf:>13}")
print(f"\nscored {len(rows)} runs")
