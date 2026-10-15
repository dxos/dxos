#!/usr/bin/env python3
#
# Copyright 2026 DXOS.org
#

"""Writes toolchain definitions from the codebase into deus/ and rebuilds the seed (D177).

The codebase is the primary copy of the toolchain; deus/ is what the seed is compiled from in git.
For each name, this replaces its declaration in the deus/ file that holds it with what `deus view`
prints from the codebase (a new name goes at the end of its namespace's file), then compiles deus/
into seed/deus.image and checks that the new seed compiles itself to itself.

    python3 scripts/sync-deus.py Cli.push Replicate.missingFrom   # codebase at $DEUS_CODEBASE

Edit the toolchain in the codebase (`deus view`, edit, `deus update`, `deus push`), then run this
with the names you changed before committing deus/ and the seed to git.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / 'deus'
SEED = ROOT / 'seed' / 'deus.image'

# Lines that start a top-level item in a .deus file.
ITEM = re.compile(r'^(def|test|theorem|structure|inductive|ability|namespace|end|@\[|/--|/-|--)(\s|$|\[)')
DECL = re.compile(r'^(def|test|theorem|structure|inductive|ability)\s+([^\s(:]+)')
HEADER = re.compile(r'^-- (\S+ #[0-9a-f]+|: .*)$')


def deus(*args, codebase, seed=None, check=True):
    env = dict(os.environ, DEUS_CODEBASE=str(codebase))
    if seed:
        env['DEUS_SEED'] = str(seed)
    result = subprocess.run(['node', str(ROOT / 'bin' / 'deus.mjs'), *args], cwd=ROOT, env=env, capture_output=True, text=True)
    if check and result.returncode != 0:
        sys.exit(f'deus {" ".join(args)} failed:\n{result.stderr}{result.stdout}')
    return result


def blocks(path):
    """(qualified name, first line, end line, namespace) for each declaration in a file; lines are 0-based, end exclusive."""
    lines = path.read_text().split('\n')
    found, stack = [], []
    starts = [i for i, line in enumerate(lines) if ITEM.match(line)] + [len(lines)]
    for index, start in enumerate(starts[:-1]):
        line = lines[start]
        if line.startswith('namespace '):
            stack.append(line.split()[1])
            continue
        if line.startswith('end '):
            stack.pop()
            continue
        match = DECL.match(line)
        if not match:
            continue
        # A doc comment and attributes directly above belong to the declaration.
        above = index
        while above > 0 and (lines[starts[above - 1]].startswith('/--') or lines[starts[above - 1]].startswith('@[')):
            above -= 1
        end = starts[index + 1]
        while end > start + 1 and lines[end - 1].strip() == '':
            end -= 1
        found.append(('.'.join(stack + [match.group(2)]), starts[above], end, '.'.join(stack)))
    return lines, found


def source_of(view, namespace):
    """A definition as `deus view` prints it, without its header, named relative to `namespace`."""
    lines = view.split('\n')
    while lines and HEADER.match(lines[0]):
        lines.pop(0)
    text = '\n'.join(lines).rstrip('\n')
    if namespace:
        text = re.sub(r'^(def|test|theorem|structure|inductive|ability)(\s+)' + re.escape(namespace) + r'\.', r'\1\2', text, count=1, flags=re.M)
    return text


def views(names, codebase, seed=None):
    if not names:
        return {}
    shown = json.loads(deus('view', *names, '--json', codebase=codebase, seed=seed).stdout)
    return {entry['name']: entry['source'] for entry in shown}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--codebase', default=os.environ.get('DEUS_CODEBASE', str(Path.home() / '.deus')))
    parser.add_argument('names', nargs='+', help='the definitions to write into deus/')
    args = parser.parse_args()
    codebase = Path(args.codebase)

    parsed = {path: blocks(path) for path in sorted(SOURCES.glob('*.deus'))}
    defined = {name: path for path, (_, found) in parsed.items() for name, *_ in found}
    namespaces = {}
    for path, (_, found) in parsed.items():
        for _, _, _, namespace in found:
            namespaces.setdefault(namespace, path)

    shown = views(args.names, codebase)
    edits = {}
    for name in args.names:
        namespace = name.rsplit('.', 1)[0] if '.' in name else ''
        if name in defined:
            path = defined[name]
            first, end = next((first, end) for qualified, first, end, _ in parsed[path][1] if qualified == name)
            print(f'  ~ {name}  ({path.name})')
            edits.setdefault(path, []).append((first, end, source_of(shown[name], namespace)))
        elif namespace in namespaces:
            path = namespaces[namespace]
            lines = parsed[path][0]
            close = max(i for i, line in enumerate(lines) if line == f'end {namespace.split(".")[-1]}')
            print(f'  + {name}  ({path.name})')
            edits.setdefault(path, []).append((close, close, source_of(shown[name], namespace) + '\n'))
        else:
            sys.exit(f'{name}: no deus/ file holds the namespace {namespace or "(root)"}')
    for path, changes in edits.items():
        lines = parsed[path][0]
        for first, end, text in sorted(changes, key=lambda change: change[0], reverse=True):
            lines[first:end] = text.split('\n')
        path.write_text('\n'.join(lines))

    with tempfile.TemporaryDirectory(prefix='deus-sync-') as scratch:
        image, again = Path(scratch) / 'seed.image', Path(scratch) / 'again.image'
        deus('compile', str(SOURCES), '--main', 'Cli.main', '-o', str(image), codebase=codebase)
        deus('compile', str(SOURCES), '--main', 'Cli.main', '-o', str(again), codebase=codebase, seed=image)
        if image.read_bytes() != again.read_bytes():
            sys.exit('the new seed does not compile itself to itself; deus/ is written, the seed is not')
        shutil.copyfile(image, SEED)
    print(f'Wrote {len(args.names)} definitions into deus/ and rebuilt the seed; it compiles itself to itself.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
