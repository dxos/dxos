#!/usr/bin/env python3
"""
Merges PR #13952's branch into the current branch the way every DEUS thread has to, many times a day.

  python3 scripts/merge-base.py [branch]

1. Fetches the branch and merges it without committing.
2. Resolves docs/DECISIONS.md and docs/TIMELINE.md, which conflict on almost every merge. It takes
   theirs and appends our new rows: decisions get the next free D-numbers, and stages the next
   stage numbers. Their "this commit" row gets their commit's hash.
3. Takes theirs for the seed and the codebase export. Then it imports their export into the local
   codebase (`$DEUS_CODEBASE` or ~/.deus), updates it from deus/ and rebuilds the seed with
   `deus image Cli.main` (the same bytes as the fixpoint, in 3 s instead of 17 s).
4. Writes the export back with `deus export codebase`.

It prints each decision it renumbered as `D<old> -> D<new>`. Rewrite our own references to those
numbers, run the tests, then commit and push at once: the branch moves every few minutes.
It does not commit, so a failed step leaves the merge for you to inspect.
"""

import re
import subprocess
import sys
import tempfile
from pathlib import Path

PKG = Path(__file__).resolve().parent.parent
ROOT = Path(subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], text=True, cwd=PKG).strip())
REL = PKG.relative_to(ROOT).as_posix()
DOCS = PKG / 'docs'


def git(*args: str, check: bool = True) -> str:
    return subprocess.run(['git', *args], cwd=ROOT, text=True, capture_output=True, check=check).stdout


def deus(*args: str) -> str:
    result = subprocess.run(['node', str(PKG / 'bin/deus.mjs'), *args], cwd=PKG, text=True, capture_output=True)
    if result.returncode != 0:
        sys.exit(f'deus {" ".join(args)} failed:\n{result.stderr}')
    return result.stdout


def show(rev: str, name: str) -> str:
    return git('show', f'{rev}:{REL}/docs/{name}')


def is_row(line: str, pattern: str) -> bool:
    return re.match(pattern, line) is not None


def merge_decisions(base: str) -> dict[int, int]:
    """Theirs, then each decision only we added, renumbered after their last."""
    theirs, ours, before = show('MERGE_HEAD', 'DECISIONS.md'), show('HEAD', 'DECISIONS.md'), show(base, 'DECISIONS.md')
    known = set(before.splitlines()) | set(theirs.splitlines())
    following = max(int(n) for n in re.findall(r'^\| D(\d+)', theirs, re.M)) + 1
    renames: dict[int, int] = {}
    text = theirs.rstrip('\n') + '\n'
    for line in ours.splitlines():
        found = re.match(r'^\| D(\d+) *\|', line)
        if found and line not in known:
            renames[int(found.group(1))] = following
            text += re.sub(r'^\| D\d+ *\|', f'| D{following} |', line, count=1) + '\n'
            following += 1
    (DOCS / 'DECISIONS.md').write_text(text)
    return renames


def renumber(line: str, renames: dict[int, int]) -> str:
    for old, new in renames.items():
        line = re.sub(rf'\bD{old}\b', f'D{new}', line)
    return line


def merge_timeline(base: str, renames: dict[int, int]) -> None:
    """Theirs with their "this commit" resolved, then each stage only we added, renumbered."""
    sha = git('rev-parse', '--short=8', 'MERGE_HEAD').strip()
    theirs = show('MERGE_HEAD', 'TIMELINE.md').replace('| this commit |', f'| `{sha}` |')
    ours, before = show('HEAD', 'TIMELINE.md'), show(base, 'TIMELINE.md')
    stage = r'^\| \d+ +\|'
    rows = [line for line in theirs.splitlines() if is_row(line, stage)]
    described = {line.split('|')[5].strip() for line in rows}
    known = set(before.splitlines()) | set(theirs.splitlines())
    last = int(re.match(r'^\| (\d+)', rows[-1]).group(1))
    added = []
    for line in ours.splitlines():
        if is_row(line, stage) and line not in known and line.split('|')[5].strip() not in described:
            last += 1
            added.append(renumber(re.sub(stage, f'| {last} |', line, count=1), renames))
    cut = theirs.index('\nTotal from stage 1')
    tail = re.sub(r'stage \d+:', f'stage {last}:', theirs[cut:])
    (DOCS / 'TIMELINE.md').write_text(theirs[:cut].rstrip('\n') + '\n' + '\n'.join(added) + '\n' + tail)


def main() -> None:
    branch = sys.argv[1] if len(sys.argv) > 1 else 'dm/agent-13-oct-x8ehi8-0y35ai'
    git('fetch', '-q', 'origin', branch)
    if subprocess.run(['git', 'merge-base', '--is-ancestor', 'FETCH_HEAD', 'HEAD'], cwd=ROOT).returncode == 0:
        print('already up to date')
        return
    git('merge', '--no-commit', 'FETCH_HEAD', check=False)
    base = git('merge-base', 'HEAD', 'MERGE_HEAD').strip()
    renames = merge_decisions(base)
    merge_timeline(base, renames)
    for path in ['seed/deus.image', 'codebase']:
        git('checkout', 'MERGE_HEAD', '--', f'{REL}/{path}')
    git('add', f'{REL}/docs', f'{REL}/seed', f'{REL}/codebase')
    conflicted = [line for line in git('diff', '--name-only', '--diff-filter=U').splitlines() if line]
    if conflicted:
        sys.exit('resolve these by hand, then rerun from step 3:\n  ' + '\n  '.join(conflicted))

    with tempfile.TemporaryDirectory() as scratch:
        subprocess.run(f'git archive MERGE_HEAD {REL}/codebase | tar -x -C {scratch}', shell=True, cwd=ROOT, check=True)
        theirs = Path(scratch) / REL / 'codebase'
        deus('update', *map(str, sorted((theirs / 'code').glob('*.deus'))), *map(str, sorted((theirs / 'specs').glob('*.mdl'))), '--by', 'merge')
        deus('task', 'import', str(theirs / 'tasks.sexp'))
        deus('history', 'import', str(theirs / 'history.sexp'))
    deus('update', 'deus', '--by', 'merge')
    deus('image', 'Cli.main', '-o', str(PKG / 'seed/deus.image'))
    deus('export', 'codebase')
    for old, new in renames.items():
        print(f'D{old} -> D{new}')
    print('merged; rewrite our references to renamed decisions, test, commit and push')


if __name__ == '__main__':
    main()
