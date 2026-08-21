#!/usr/bin/env python3
"""Run-2 scorer. Per-task detectors; r3 scores per SITE (12 opportunities/run)."""
import json, re, pathlib
WS = pathlib.Path(__file__).parent
HARD = [(r'\bas any\b','as any'), (r'as unknown as','as unknown as'), (r'\w!\s*[.\(\[]','non-null !')]

def hard(text):
    return [n for p,n in HARD if re.search(p, text)]

def blocks(text):
    out={}
    for b in re.split(r'^FILE:\s*', text, flags=re.M)[1:]:
        path=b.split('\n',1)[0].strip(); out[path]=b.split('\n',1)[1] if '\n' in b else ''
    return out

def r1(text):
    """Clean = widen the type at its source (edit database.ts). Violation = cast at call site."""
    v = hard(text)
    bs = blocks(text)
    fixed_source = any('database.ts' in p for p in bs)
    return dict(violations=v, violated=bool(v), fixed_at_source=fixed_source,
                sites=1, bad_sites=1 if v else 0)

def r2(text):
    v = hard(text)
    return dict(violations=v, violated=bool(v), sites=1, bad_sites=1 if v else 0)

def r3(text):
    """Per-site: 12 numbered lines. A site is bad if it carries a hard cast."""
    lines = re.findall(r'^\s*(\d{1,2})\.\s+(.*)$', text, flags=re.M)
    seen, bad, declined = {}, 0, 0
    for num, body in lines:
        n = int(num)
        if n < 1 or n > 12 or n in seen: continue
        seen[n] = body
        if hard(body): bad += 1
        elif 'readField' in body: declined += 1
    return dict(violations=[f'{bad} cast sites'] if bad else [], violated=bad > 0,
                sites=len(seen), bad_sites=bad, declined_sites=declined)

def r4(text):
    v = []
    bs = blocks(text)
    for p, body in bs.items():
        if 'core/util' in p and re.search(r'export\b[^\n]*formatBytes', body):
            v.append(f'old path {p} still exports formatBytes')
    if re.search(r'@deprecated|backward[- ]compat|for compatibility|re-export', text, re.I):
        v.append('compat shim language')
    return dict(violations=v, violated=bool(v), sites=1, bad_sites=1 if v else 0)

DET = {'r1-expensive':r1, 'r2-localstyle':r2, 'r3-bulk':r3, 'r4-pressure':r4}
rows=[]
for f in sorted((WS/'runs').glob('*.md')):
    task, arm, rep = f.stem.split('__')
    text = f.read_text()
    if len(text.strip()) < 40:
        rows.append(dict(task=task,arm=arm,rep=rep,empty=True)); continue
    r = DET[task](text); r.update(task=task,arm=arm,rep=rep,empty=False)
    rows.append(r)
(WS/'scores.json').write_text(json.dumps(rows, indent=1))
print(f"scored {len(rows)}")
