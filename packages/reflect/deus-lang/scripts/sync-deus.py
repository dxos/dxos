#!/usr/bin/env python3
#
# Copyright 2026 DXOS.org
#

"""Writes toolchain definitions from the codebase into deus/ and rebuilds the seed (D177).

The codebase is the primary copy of the toolchain; deus/ is what the seed is compiled from in git.
For each name, this replaces its declaration in the deus/ file that holds it with what `deus view`
prints from the codebase (a new name goes at the end of its namespace's file, a new namespace gets a
file), deletes what the codebase no longer has, adds what those definitions use that deus/ lacks, then compiles deus/ into seed/deus.image and
checks that the new seed compiles itself to itself and that deus/ compiles to the codebase's hashes (D183).

    python3 scripts/sync-deus.py                # every definition whose hash differs (codebase at $DEUS_CODEBASE)
    python3 scripts/sync-deus.py Cli.push       # only these

Edit the toolchain in the codebase (`deus view`, edit, `deus update`, `deus push`), then run this
(with no names, or the names you changed) before committing deus/ and the seed to git.
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


def hashes(codebase):
    return {entry['name']: (entry['hash'], entry['kind']) for entry in json.loads(deus('ls', '--json', codebase=codebase).stdout)}


def compared(codebase):
    """(names whose codebase hash differs from what deus/ compiles to, names deus/ defines that the codebase lacks)."""
    with tempfile.TemporaryDirectory(prefix='deus-sync-') as scratch:
        store = Path(scratch) / 'codebase'
        deus('init', '--empty', codebase=store)
        deus('add', str(SOURCES), codebase=store)
        ours = hashes(store)
    theirs = hashes(codebase)
    kept = ('op', 'ctor')
    mine = {name: hash for name, (hash, kind) in ours.items() if kind not in kept}
    return (sorted(name for name, hash in mine.items() if name in theirs and theirs[name][0] != hash),
            sorted(name for name in mine if name not in theirs))


def changed(codebase):
    return compared(codebase)[0]


def drop(names):
    """Deletes the declarations of `names` from deus/, so a later whole-file `deus update` cannot bring back what the codebase deleted (DataSafety.Spec)."""
    for path in sorted(SOURCES.glob('*.deus')):
        lines, found = blocks(path)
        doomed = [(first, end, name) for name, first, end, _ in found if name in names]
        for first, end, name in sorted(doomed, reverse=True):
            print(f'  - {name}  ({path.name})')
            del lines[first:end]
            while first < len(lines) and first > 0 and lines[first].strip() == '' and lines[first - 1].strip() == '':
                del lines[first]
        if doomed:
            path.write_text('\n'.join(lines))


def write(names, codebase):
    """Replaces each name's declaration in deus/ with the codebase's, or appends it to its namespace's file."""
    parsed = {path: blocks(path) for path in sorted(SOURCES.glob('*.deus'))}
    defined = {name: path for path, (_, found) in parsed.items() for name, *_ in found}
    namespaces = {}
    for path, (_, found) in parsed.items():
        for _, _, _, namespace in found:
            namespaces.setdefault(namespace, path)

    shown = views(names, codebase)
    edits = {}
    for name in names:
        namespace = name.rsplit('.', 1)[0] if '.' in name else ''
        if name in defined:
            path = defined[name]
            first, end = next((first, end) for qualified, first, end, _ in parsed[path][1] if qualified == name)
            print(f'  ~ {name}  ({path.name})')
            edits.setdefault(path, []).append((first, end, source_of(shown[name], namespace)))
        elif re.search(r'^-- an? (field|constructor) of ', shown[name], re.M):
            continue  # written with its type
        elif not namespace:
            # A root declaration, often a type its namespace's functions share a name with, goes above that namespace.
            path = namespaces.get(name) or namespaces['']
            print(f'  + {name}  ({path.name})')
            edits.setdefault(path, []).append((0, 0, source_of(shown[name], '') + '\n'))
        elif namespace in namespaces:
            path = namespaces[namespace]
            lines = parsed[path][0]
            close = max(i for i, line in enumerate(lines) if line == f'end {namespace.split(".")[-1]}')
            print(f'  + {name}  ({path.name})')
            edits.setdefault(path, []).append((close, close, source_of(shown[name], namespace) + '\n'))
        elif namespace:
            # A namespace the codebase added gets a file of its own.
            segments = namespace.split('.')
            path = namespaces.get(namespace) or next(
                candidate
                for candidate in (SOURCES / f'{namespace.lower().replace(".", "-")}{suffix}.deus' for suffix in ('', '-namespace', '-2', '-3'))
                if not candidate.exists()
            )
            if not path.exists():
                path.write_text(''.join(f'namespace {seg}\n' for seg in segments) + ''.join(f'end {seg}\n' for seg in reversed(segments)))
                parsed[path] = blocks(path)
                namespaces[namespace] = path
            lines = parsed[path][0]
            close = max(i for i, line in enumerate(lines) if line == f'end {segments[-1]}')
            print(f'  + {name}  ({path.name}, new)')
            edits.setdefault(path, []).append((close, close, source_of(shown[name], namespace) + '\n'))
        else:
            sys.exit(f'{name}: no deus/ file holds the root namespace')
    for path, changes in edits.items():
        lines = parsed[path][0]
        for first, end, text in sorted(changes, key=lambda change: change[0], reverse=True):
            lines[first:end] = text.split('\n')
        path.write_text('\n'.join(lines))


def defined_names():
    return {name for path in SOURCES.glob('*.deus') for name, *_ in blocks(path)[1]}


def unknown(codebase):
    """The first name deus/ uses but does not define, or None when deus/ compiles."""
    with tempfile.TemporaryDirectory(prefix='deus-sync-') as scratch:
        result = deus('compile', str(SOURCES), '--main', 'Cli.main', '-o', str(Path(scratch) / 'seed.image'), codebase=codebase, check=False)
    if result.returncode == 0:
        return None
    ambiguous = re.search(r'ambiguous name (\S+):', result.stderr)
    if ambiguous:
        return (None, -1, 0, ambiguous.group(1))
    match = re.search(r'(?:(\S+\.deus): \S+:(\d+):(\d+): )?unknown (?:type|name|ability|constructor) (\S+)', result.stderr)
    if not match:
        sys.exit(f'deus/ does not compile:\n{result.stderr}')
    where = (Path(match.group(1)), int(match.group(2)), int(match.group(3))) if match.group(1) else (None, 0, 0)
    return (*where, match.group(4))


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--codebase', default=os.environ.get('DEUS_CODEBASE', str(Path.home() / '.deus')))
    parser.add_argument('names', nargs='*', help='the definitions to write into deus/; without names, every one whose hash differs')
    args = parser.parse_args()
    codebase = Path(args.codebase)
    if args.names:
        names, deleted = list(args.names), []
    else:
        names, deleted = compared(codebase)
    if not names and not deleted:
        print('deus/ already compiles to the codebase\'s definitions; nothing to write.')
        return 0

    drop(set(deleted))
    write(names, codebase)
    theirs = hashes(codebase)
    for _ in range(2000):
        failure = unknown(codebase)
        if not failure:
            break
        path, line, column, missing = failure
        if line == -1:
            # A name the codebase added made a short reference in an unchanged definition ambiguous; the codebase prints it qualified.
            bare = re.compile(r'(?<![\w.])' + re.escape(missing) + r'\b')
            users = [name for file in SOURCES.glob('*.deus') for name, first, end, _ in blocks(file)[1]
                     if name not in names and bare.search('\n'.join(blocks(file)[0][first:end]).split(':=', 1)[-1])]
            if not users:
                sys.exit(f'{missing} is ambiguous in deus/ and no unchanged definition uses it bare')
            names += users
            write(users, codebase)
            continue
        found = [name for name in theirs if name == missing or name.endswith('.' + missing)]
        if len(found) != 1:
            sys.exit(f'{path or "deus/"}:{line}:{column}: {missing} names {len(found)} codebase definitions, not one')
        if found[0] not in defined_names() or path is None:
            # A changed definition can use one the codebase added since deus/ was last synced.
            names.append(found[0])
            write(found, codebase)
        else:
            # `deus view` shortens a name to the suffix unique in the whole codebase, which deus/ alone does not resolve.
            path = path if path.is_absolute() else ROOT / path
            lines = path.read_text().split('\n')
            text = lines[line - 1]
            start = next((at for at in (column - 1, column) if text[at:at + len(missing)] == missing), None)
            if start is None:
                sys.exit(f'{path.name}:{line}:{column}: expected {missing} there')
            lines[line - 1] = text[:start] + found[0] + text[start + len(missing):]
            path.write_text('\n'.join(lines))
            print(f'  = {found[0]}  ({path.name}:{line})')

    with tempfile.TemporaryDirectory(prefix='deus-sync-') as scratch:
        image, again = Path(scratch) / 'seed.image', Path(scratch) / 'again.image'
        deus('compile', str(SOURCES), '--main', 'Cli.main', '-o', str(image), codebase=codebase)
        deus('compile', str(SOURCES), '--main', 'Cli.main', '-o', str(again), codebase=codebase, seed=image)
        if image.read_bytes() != again.read_bytes():
            sys.exit('the new seed does not compile itself to itself; deus/ is written, the seed is not')
        shutil.copyfile(image, SEED)
    left, extra = compared(codebase)
    if left:
        sys.exit(f'deus/ still differs from the codebase in {len(left)} definitions, among them {", ".join(left[:5])}')
    if extra and not args.names:
        sys.exit(f'deus/ still defines {len(extra)} names the codebase lacks, among them {", ".join(extra[:5])}')
    print(f'Wrote {len(names)} definitions into deus/, removed {len(deleted)} the codebase deleted, and rebuilt the seed; '
          'it compiles itself to itself and to the codebase\'s hashes.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
