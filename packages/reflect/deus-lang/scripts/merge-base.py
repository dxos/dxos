#!/usr/bin/env python3
"""
Merges PR #13952's branch into the current branch the way every DEUS thread has to, many times a day.

  python3 scripts/merge-base.py [branch]

1. Fetches the branch and merges it without committing.
2. Resolves docs/DECISIONS.md and docs/TIMELINE.md, which conflict on almost every merge. It takes
   theirs and appends our new rows: decisions get the next free D-numbers, and stages the next
   stage numbers. Their "this commit" row gets their commit's hash.
3. Merges the export's files three ways and restores them into a fresh codebase, with both sides'
   tasks and history, updates it from deus/ and rebuilds the seed with `deus image Cli.main` (the
   same bytes as the fixpoint, in 3 s instead of 17 s). Importing into the local codebase instead
   left stale hashes that exported as Unnamed.deus.
4. Writes the export back with `deus export codebase`, and makes the fresh codebase the local one
   (`$DEUS_CODEBASE` or ~/.deus), keeping the old one beside it as `<dir>.before-merge`. It refuses to
   start when the local codebase holds changes HEAD's export lacks.

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
    known = set(before.splitlines()) | set(theirs.splitlines())
    last = int(re.match(r'^\| (\d+)', rows[-1]).group(1))
    added = []
    for line in ours.splitlines():
        if is_row(line, stage) and line not in known and line.split('|')[5].strip() not in described:
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


def blob(rev: str, path: str) -> str | None:
    result = subprocess.run(['git', 'show', f'{rev}:{path}'], cwd=ROOT, text=True, capture_output=True)
    return result.stdout if result.returncode == 0 else None


def merged_export(base: str, out: Path) -> None:
    """The export's code and specs as both sides changed them, each file merged three ways."""
    conflicts = []
    for kind, suffix in (('code', '.deus'), ('specs', '.mdl')):
        (out / kind).mkdir(parents=True)
        listed = git('ls-tree', '--name-only', 'HEAD', f'{REL}/codebase/{kind}/') + git('ls-tree', '--name-only', 'MERGE_HEAD', f'{REL}/codebase/{kind}/')
        for name in sorted({Path(line).name for line in listed.splitlines() if line.endswith(suffix)}):
            path = f'{REL}/codebase/{kind}/{name}'
            before, ours, theirs = blob(base, path), blob('HEAD', path), blob('MERGE_HEAD', path)
            if theirs == before:
                text = ours
            elif ours == before or ours == theirs:
                text = theirs
            elif ours is None or theirs is None:
                text = ours if theirs is None else theirs
            else:
                parts = [out / f'{name}.{side}' for side in ('ours', 'base', 'theirs')]
                for part, version in zip(parts, [ours, before or '', theirs]):
                    part.write_text(version)
                if subprocess.run(['git', 'merge-file', *map(str, parts)], capture_output=True).returncode != 0:
                    conflicts.append(path)
                text = parts[0].read_text()
                for part in parts:
                    part.unlink()
            if text is not None:
                (out / kind / name).write_text(text)
    if conflicts:
        sys.exit('both sides changed the same lines; merge these by hand:\n  ' + '\n  '.join(conflicts))


def merged_tasks(base: str) -> str:
    """
    tasks.sexp merged task by task: a task one side changed takes that side. Importing both files
    in turn would let the second undo the first's changes.
    """
    def tasks(rev: str) -> dict[str, str]:
        text = blob(rev, f'{REL}/codebase/tasks.sexp') or ''
        return {m.group(1): line for line in text.splitlines() if (m := re.match(r'\(task \(id "([^"]+)"\)', line))}

    before, ours, theirs = tasks(base), tasks('HEAD'), tasks('MERGE_HEAD')
    lines = []
    for id in sorted(set(ours) | set(theirs)):
        b, o, t = before.get(id), ours.get(id), theirs.get(id)
        if t == b:
            chosen = o
        elif o == b or o == t:
            chosen = t
        else:
            print(f'task {id} changed on both sides; kept ours, so re-apply theirs')
            chosen = o if o is not None else t
        if chosen is not None:
            lines.append(chosen)
    return '\n'.join(lines) + '\n'


def exported_matches_head(scratch: Path) -> bool:
    """Whether the local codebase holds nothing HEAD's export lacks, so replacing it loses nothing."""
    deus('export', str(scratch / 'local'))
    subprocess.run(f'git archive HEAD {REL}/codebase | tar -x -C {scratch}', shell=True, cwd=ROOT, check=True)
    return subprocess.run(['diff', '-rq', str(scratch / 'local'), str(scratch / REL / 'codebase')], capture_output=True).returncode == 0


def main() -> None:
    branch = sys.argv[1] if len(sys.argv) > 1 else 'dm/agent-13-oct-x8ehi8-0y35ai'
    git('fetch', '-q', 'origin', branch)
    if subprocess.run(['git', 'merge-base', '--is-ancestor', 'FETCH_HEAD', 'HEAD'], cwd=ROOT).returncode == 0:
        print('already up to date')
        return
    local = Path(os.environ.get('DEUS_CODEBASE') or Path.home() / '.deus')
    with tempfile.TemporaryDirectory() as tmp:
        if local.exists() and not exported_matches_head(Path(tmp)):
            sys.exit(f'{local} holds changes the export at HEAD lacks: run `deus export codebase` and commit first')
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

    with tempfile.TemporaryDirectory() as tmp:
        scratch = Path(tmp)
        # Importing into a codebase that holds older definitions leaves their dependents on stale
        # hashes, which export as Unnamed.deus; a fresh codebase built from the merged export has none.
        merged_export(base, scratch / 'merged')
        fresh = scratch / 'fresh'
        os.environ['DEUS_CODEBASE'] = str(fresh)
        deus('init', '--empty')
        deus('add', str(scratch / 'merged' / 'code'), str(scratch / 'merged' / 'specs'))
        (scratch / 'tasks.sexp').write_text(merged_tasks(base))
        deus('task', 'import', str(scratch / 'tasks.sexp'))
        for rev in ('HEAD', 'MERGE_HEAD'):
            (scratch / 'history.sexp').write_text(blob(rev, f'{REL}/codebase/history.sexp') or '')
            deus('history', 'import', str(scratch / 'history.sexp'))
        deus('update', 'deus', '--by', 'merge')
        deus('image', 'Cli.main', '-o', str(PKG / 'seed/deus.image'))
        deus('export', 'codebase')
        backup = local.with_name(local.name + '.before-merge')
        shutil.rmtree(backup, ignore_errors=True)
        if local.exists():
            local.rename(backup)
        shutil.copytree(fresh, local)
        print(f'the local codebase is now the merged one; the old one is at {backup}')
    for old, new in renames.items():
        print(f'D{old} -> D{new}')
    print('merged; rewrite our references to renamed decisions, test, commit and push')


if __name__ == '__main__':
    main()
