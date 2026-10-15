#!/usr/bin/env python3
"""
Merges PR #13952's branch into the current branch the way every DEUS thread has to, many times a day.

  python3 scripts/merge-base.py [branch]

1. Fetches the branch and merges it without committing.
2. Resolves docs/DECISIONS.md and docs/TIMELINE.md, which conflict on almost every merge. It takes
   theirs and appends our new rows: decisions get the next free D-numbers, and stages the next
   stage numbers. Their "this commit" row gets their commit's hash.
3. Takes their seed, drops the old codebase export (the codebase is the primary copy and
   github.com/dxos/deus-mirror its backup, D171), and when deus/ changed on both sides compiles the
   merged deus/ into a new seed and checks that it compiles itself to itself.

It prints each decision it renumbered as `D<old> -> D<new>`. Rewrite our own references to those
numbers, run the tests, then commit and push at once: the branch moves every few minutes.
It does not commit, so a failed step leaves the merge for you to inspect.
"""

import os
import re
import shutil
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


def deus(*args: str, seed: Path | None = None) -> str:
    env = dict(os.environ, DEUS_SEED=str(seed)) if seed else None
    result = subprocess.run(['node', str(PKG / 'bin/deus.mjs'), *args], cwd=PKG, text=True, capture_output=True, env=env)
    if result.returncode != 0:
        sys.exit(f'deus {" ".join(args)} failed:\n{result.stderr}')
    return result.stdout


def show(rev: str, name: str) -> str:
    return git('show', f'{rev}:{REL}/docs/{name}')


def plain(text: str) -> set[str]:
    # oxfmt re-pads a whole table when one row widens it, so rows compare without their padding.
    return {re.sub(r' +', ' ', line) for line in text.splitlines()}


def is_row(line: str, pattern: str) -> bool:
    return re.match(pattern, line) is not None


def merge_decisions(base: str) -> dict[int, int]:
    """Theirs, then each decision only we added, renumbered after their last."""
    theirs, ours, before = show('MERGE_HEAD', 'DECISIONS.md'), show('HEAD', 'DECISIONS.md'), show(base, 'DECISIONS.md')
    known = plain(before) | plain(theirs)
    following = max(int(n) for n in re.findall(r'^\| D(\d+)', theirs, re.M)) + 1
    renames: dict[int, int] = {}
    text = theirs.rstrip('\n') + '\n'
    for line in ours.splitlines():
        found = re.match(r'^\| D(\d+) *\|', line)
        if found and re.sub(r' +', ' ', line) not in known:
            renames[int(found.group(1))] = following
            text += re.sub(r'^\| D\d+ *\|', f'| D{following} |', line, count=1) + '\n'
            following += 1
    (DOCS / 'DECISIONS.md').write_text(text)
    return renames


def renumber(line: str, renames: dict[int, int]) -> str:
    # One pass over all numbers: renaming D140 -> D141 and then D141 -> D142 would make both D142.
    return re.sub(r'\bD(\d+)\b', lambda m: f'D{renames.get(int(m.group(1)), int(m.group(1)))}', line)


def duration(text: str) -> int:
    """Minutes in a stage's duration such as `1h 05m` or `25m 00s`."""
    hours = re.search(r'(\d+)h', text)
    minutes = re.search(r'(\d+)m', text)
    return (int(hours.group(1)) * 60 if hours else 0) + (int(minutes.group(1)) if minutes else 0)


def merge_timeline(base: str, renames: dict[int, int]) -> None:
    """Theirs with their "this commit" resolved, then each stage only we added, renumbered."""
    sha = git('rev-parse', '--short=8', 'MERGE_HEAD').strip()
    theirs = show('MERGE_HEAD', 'TIMELINE.md').replace('| this commit |', f'| `{sha}` |')
    ours, before = show('HEAD', 'TIMELINE.md'), show(base, 'TIMELINE.md')
    stage = r'^\| \d+ +\|'
    rows = [line for line in theirs.splitlines() if is_row(line, stage)]
    described = {line.split('|')[5].strip() for line in rows}
    known = plain(before) | plain(theirs)
    last = int(re.match(r'^\| (\d+)', rows[-1]).group(1))
    added = []
    for line in ours.splitlines():
        if is_row(line, stage) and re.sub(r' +', ' ', line) not in known and line.split('|')[5].strip() not in described:
            last += 1
            added.append(renumber(re.sub(stage, f'| {last} |', line, count=1), renames))
    cut = theirs.index('\nTotal from stage 1')
    tail = re.sub(r'stage \d+:', f'stage {last}:', theirs[cut:])
    # The total adds our stages' durations to theirs.
    found = re.search(r'(\d+)h (\d+)m\.', tail)
    if found:
        minutes = int(found.group(1)) * 60 + int(found.group(2)) + sum(duration(line.split('|')[3]) for line in added)
        tail = tail[:found.start()] + f'{minutes // 60}h {minutes % 60:02d}m.' + tail[found.end():]
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
    git('checkout', 'MERGE_HEAD', '--', f'{REL}/seed/deus.image')
    git('rm', '-r', '-q', '--ignore-unmatch', f'{REL}/codebase')
    git('add', f'{REL}/docs', f'{REL}/seed')
    conflicted = [line for line in git('diff', '--name-only', '--diff-filter=U').splitlines() if line]
    if conflicted:
        sys.exit('resolve these by hand, then rerun from step 3:\n  ' + '\n  '.join(conflicted))

    changed = subprocess.run(['git', 'diff', '--quiet', base, 'HEAD', '--', f'{REL}/deus'], cwd=ROOT).returncode != 0
    if changed:
        # Their seed compiles their deus/; ours changed it too, so the merged sources need a seed of their own.
        with tempfile.TemporaryDirectory() as tmp:
            seed, again = Path(tmp) / 'seed.image', Path(tmp) / 'again.image'
            deus('compile', 'deus', '--main', 'Cli.main', '-o', str(seed))
            deus('compile', 'deus', '--main', 'Cli.main', '-o', str(again), seed=seed)
            if seed.read_bytes() != again.read_bytes():
                sys.exit('the merged seed does not compile itself to itself')
            shutil.copyfile(seed, PKG / 'seed/deus.image')
        git('add', f'{REL}/seed')
    for old, new in renames.items():
        print(f'D{old} -> D{new}')
    print('merged; rewrite our references to renamed decisions, test, commit and push')


if __name__ == '__main__':
    main()
