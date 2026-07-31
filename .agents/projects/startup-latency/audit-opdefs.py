#!/usr/bin/env python3
"""Transitive value-import audit of operation-definition files.

For each file containing Operation.make(), walks the browser-condition source graph
(relative, #subpath, @dxos/* workspace) collecting external packages and workspace files
reached. Type-only imports are skipped — they cost nothing at runtime. Externals are
weighted with total renderedLength from chunk-stats as a proxy for full-pull cost."""

import json, os, re, sys
from collections import defaultdict, deque

ROOT = '/home/user/dxos'
SCRATCH = os.path.dirname(os.path.abspath(__file__))

# --- workspace package map -------------------------------------------------------------
pkg_dir = {}
pkg_json = {}
for dirpath, dirnames, filenames in os.walk(os.path.join(ROOT, 'packages')):
    dirnames[:] = [d for d in dirnames if d not in ('node_modules', 'dist', 'out', 'coverage', '.moon')]
    if 'package.json' in filenames:
        try:
            pj = json.load(open(os.path.join(dirpath, 'package.json')))
        except Exception:
            continue
        name = pj.get('name')
        if name:
            pkg_dir[name] = dirpath
            pkg_json[name] = pj

def cond_source(spec):
    """Resolve an exports/imports map value to a browser-source path string."""
    if isinstance(spec, str):
        return spec
    if isinstance(spec, dict):
        for key in ('source', 'browser', 'default', 'import'):
            if key in spec:
                return cond_source(spec[key])
    return None

def resolve_subpath(pkg, sub):
    """Resolve @scope/pkg[/sub] to a source file path, or None."""
    base = pkg_dir.get(pkg)
    if not base:
        return None
    pj = pkg_json[pkg]
    exports = pj.get('exports') or {}
    key = '.' if not sub else f'./{sub}'
    spec = exports.get(key)
    if spec is None and sub:
        # wildcard
        for k, v in exports.items():
            if k.endswith('/*') and key.startswith(k[:-1]):
                rest = key[len(k) - 1:]
                s = cond_source(v)
                if s:
                    return resolve_file(os.path.join(base, s.replace('*', rest)))
    if spec is not None:
        s = cond_source(spec)
        if isinstance(s, dict):
            s = cond_source(s)
        if s:
            return resolve_file(os.path.join(base, s))
    if not sub:
        return resolve_file(os.path.join(base, 'src/index.ts'))
    return resolve_file(os.path.join(base, 'src', sub))

def resolve_file(path):
    path = os.path.normpath(path)
    for cand in (path, path + '.ts', path + '.tsx', os.path.join(path, 'index.ts'), os.path.join(path, 'index.tsx')):
        if os.path.isfile(cand):
            return cand
    return None

IMPORT_RE = re.compile(r"^\s*(?:import|export)\s+(?:([\w${},*\s]+?)\s+from\s+)?['\"]([^'\"]+)['\"]", re.M)
TYPE_ONLY = re.compile(r"^\s*(?:import|export)\s+type\b")

def file_imports(path):
    try:
        txt = open(path, encoding='utf8', errors='replace').read()
    except OSError:
        return []
    out = []
    for m in re.finditer(r"^\s*(?:import|export)[^\n;]*?from\s+['\"]([^'\"]+)['\"]|^\s*import\s+['\"]([^'\"]+)['\"]", txt, re.M):
        line = m.group(0)
        if TYPE_ONLY.match(line):
            continue
        # An import whose specifiers are ALL inline-`type` is elided at emit — not a value edge.
        braces = re.search(r"\{([^}]*)\}", line)
        if braces:
            specs = [s.strip() for s in braces.group(1).split(',') if s.strip()]
            if specs and all(s.startswith('type ') for s in specs) and not re.search(r"import\s+[\w$]+\s*,", line):
                continue
        spec = m.group(1) or m.group(2)
        out.append((spec, line.strip()[:120]))
    return out

def resolve(spec, from_file):
    """Returns ('file', path) | ('ext', package) | None."""
    if spec.startswith('.'):
        f = resolve_file(os.path.join(os.path.dirname(from_file), spec))
        return ('file', f) if f else None
    if spec.startswith('#'):
        # package-internal subpath import — find owning package.json walking up
        d = os.path.dirname(from_file)
        while d.startswith(ROOT):
            pj_path = os.path.join(d, 'package.json')
            if os.path.isfile(pj_path):
                try:
                    pj = json.load(open(pj_path))
                except Exception:
                    break
                imp = (pj.get('imports') or {}).get(spec) or (pj.get('imports') or {}).get(spec + '/*')
                s = cond_source(imp) if imp else None
                if s:
                    f = resolve_file(os.path.join(d, s))
                    return ('file', f) if f else None
                break
            d = os.path.dirname(d)
        return None
    parts = spec.split('/')
    pkg = '/'.join(parts[:2]) if spec.startswith('@') else parts[0]
    sub = '/'.join(parts[2:]) if spec.startswith('@') else '/'.join(parts[1:])
    if pkg in pkg_dir:
        f = resolve_subpath(pkg, sub)
        return ('file', f) if f else ('ext', pkg)
    return ('ext', pkg)

# memoized per-file resolved edges
EDGES = {}
def edges(path):
    if path not in EDGES:
        out = []
        for spec, line in file_imports(path):
            r = resolve(spec, path)
            if r:
                out.append((r, spec, line))
        EDGES[path] = out
    return EDGES[path]

def walk(start):
    seen_files, exts = set(), {}
    parent = {}
    q = deque([start]); seen_files.add(start)
    while q:
        f = q.popleft()
        for (kind, tgt), spec, line in edges(f):
            if kind == 'file' and tgt not in seen_files:
                seen_files.add(tgt); parent[tgt] = f
                q.append(tgt)
            elif kind == 'ext' and tgt not in exts:
                exts[tgt] = f
    return seen_files, exts, parent

# --- external weights from chunk-stats -------------------------------------------------
stats = json.load(open(os.path.join(ROOT, 'packages/apps/composer-app/out/chunk-stats.json')))
ext_bytes = defaultdict(int)
for c in stats['chunks']:
    for p, b in c['byPackage'].items():
        ext_bytes[p] += b

BASELINE = {
    'effect', 'react', 'react-dom', '@effect-atom/atom', '@dxos/echo', '@dxos/keys', '@dxos/util',
    '@dxos/invariant', '@dxos/log', '@dxos/debug', '@dxos/app-framework', '@dxos/schema', '@dxos/types',
    '@dxos/compute', '@dxos/artifact', '@dxos/client', '@dxos/react-client', '@dxos/context',
    '@dxos/async', '@dxos/crypto', '@dxos/protocols', '@dxos/config', '@dxos/link', '@dxos/live-object',
    '@dxos/echo-signals', '@dxos/local-storage',
}

files = [l.strip() for l in open(os.path.join(SCRATCH, 'opdef-files.txt')) if l.strip()]
report = []
for rel in files:
    if '.test.' in rel or '/testing/' in rel:
        continue
    start = os.path.join(ROOT, rel)
    if not os.path.isfile(start):
        continue
    seen, exts, parent = walk(start)
    heavy = []
    for pkg, via in exts.items():
        if pkg in BASELINE or pkg.startswith('node:'):
            continue
        kb = ext_bytes.get(pkg, 0) / 1024
        if kb >= 50:
            heavy.append((pkg, kb, via))
    ui = [f for f in seen if re.search(r'/(components|containers)/', f) and f.endswith('.tsx')]
    impl = [f for f in seen if re.search(r'/src/(operations|capabilities)/', f) and not f.endswith(('Operation.ts', 'definitions.ts'))]
    report.append({
        'file': rel,
        'workspaceFiles': len(seen),
        'heavyExternals': sorted(heavy, key=lambda h: -h[1]),
        'uiFiles': len(ui),
        'implFiles': len(impl),
        'implSample': [os.path.relpath(f, ROOT) for f in sorted(impl)[:4]],
    })

report.sort(key=lambda r: -sum(h[1] for h in r['heavyExternals']))
json.dump(report, open(os.path.join(SCRATCH, 'opdef-audit.json'), 'w'), indent=1)
print(f"{'definition file':<72} {'files':>6} {'ui':>4} {'impl':>5}  heavy externals (KB rendered)")
for r in report:
    hx = ', '.join(f'{p}:{kb:.0f}' for p, kb, _ in r['heavyExternals'][:5])
    print(f"{r['file'][:72]:<72} {r['workspaceFiles']:>6} {r['uiFiles']:>4} {r['implFiles']:>5}  {hx}")
