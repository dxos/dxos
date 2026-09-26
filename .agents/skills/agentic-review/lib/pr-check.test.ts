//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { git, prChangedFiles } from './git.ts';
import { checkPr, countLoc, parseNumstat } from './pr-check.ts';

let repo: string;

const run = (...args: string[]): string => git(args, { cwd: repo });

const write = (path: string, text: string): void => {
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), text);
};

const commit = (message: string): string => {
  run('add', '-A');
  run('commit', '-q', '-m', message);
  return run('rev-parse', 'HEAD');
};

const lines = (count: number, tag = 'line'): string =>
  Array.from({ length: count }, (_, index) => `${tag} ${index}`).join('\n') + '\n';

/** Commit a finalized review of HEAD whose RESOLUTION.md rows carry `statuses`. */
const commitReview = (statuses: string[]): string => {
  const reviewed = run('rev-parse', 'HEAD');
  const slug = run('rev-parse', '--short', 'HEAD');
  write(
    `.agents/reviews/${slug}/REVIEW.md`,
    `---\nbranch: feature\ncommit: ${reviewed}\nbase: x\nmode: fast\nisFinalized: true\n---\n`,
  );
  write(
    `.agents/reviews/${slug}/RESOLUTION.md`,
    statuses
      .map((status, index) => `- ${slug}-${index + 1} - ${status} - some-rule - src/a.ts:${index + 1}`)
      .join('\n') + '\n',
  );
  commit('review');
  return slug;
};

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'pr-check-'));
  run('init', '-q', '-b', 'main');
  run('config', 'user.email', 'test@example.com');
  run('config', 'user.name', 'test');
  write('.gitattributes', 'gen/** linguist-generated=true\n');
  write('src/a.ts', lines(10));
  write('src/main-only.ts', lines(10));
  commit('initial');
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

/** Branch `feature` off main with 100 authored lines; returns the merge-base. */
const startFeature = (): string => {
  const base = run('rev-parse', 'HEAD');
  run('checkout', '-q', '-b', 'feature');
  write('src/b.ts', lines(100));
  commit('feature work');
  return base;
};

/** Advance main by touching `path`, then merge it into feature, resolving any conflict with `resolve`. */
const mergeMain = (path: string, text: string, resolve?: string): string => {
  run('checkout', '-q', 'main');
  write(path, text);
  commit('main work');
  run('checkout', '-q', 'feature');
  if (git(['merge', '-q', '--no-edit', 'main'], { cwd: repo, allowFail: true }) == null) {
    write(path, resolve ?? text);
    commit('merge main');
  }
  return run('merge-base', 'HEAD', 'main');
};

describe('parseNumstat / countLoc', () => {
  test('drops binaries, lockfiles, generated files and review stores', () => {
    write('gen/out.ts', 'x\n');
    const entries = parseNumstat(
      [
        '3\t2\tsrc/a.ts',
        '-\t-\timage.png',
        '500\t0\tpnpm-lock.yaml',
        '40\t0\tgen/out.ts',
        '9\t0\t.agents/reviews/abc/REVIEW.md',
      ].join('\n'),
    );
    expect(entries).toHaveLength(4);
    expect(countLoc(entries, repo)).toBe(5);
  });
});

describe('prChangedFiles', () => {
  test('ignores files that arrived by merging main, including a conflict resolution', () => {
    const initial = run('rev-parse', 'HEAD');
    run('checkout', '-q', '-b', 'feature');
    write('src/a.ts', 'feature edit\n');
    write('src/b.ts', lines(3));
    commit('feature work');
    run('checkout', '-q', 'main');
    write('src/a.ts', 'main edit\n');
    write('src/main-only.ts', 'changed on main\n');
    commit('main work');
    run('checkout', '-q', 'feature');
    git(['merge', '-q', '--no-edit', 'main'], { cwd: repo, allowFail: true });
    write('src/a.ts', 'resolved\n');
    commit('merge main');

    // Against the original fork point main's own file shows in the net diff but was never authored here.
    expect([...prChangedFiles(initial, repo)].sort()).toEqual(['src/a.ts', 'src/b.ts']);
    const base = run('merge-base', 'HEAD', 'main');
    expect([...prChangedFiles(base, repo)].sort()).toEqual(['src/a.ts', 'src/b.ts']);
  });
});

describe('checkPr', () => {
  test('fails without a review and names the fast command', () => {
    const base = startFeature();
    const check = checkPr({ base, root: repo });
    expect(check.ok).toBe(false);
    expect(check.prLoc).toBe(100);
    expect(check.problems[0]).toContain('no agentic review');
  });

  test('passes with every issue addressed and drift under the limit', () => {
    const base = startFeature();
    commitReview(['resolved', 'ignored']);
    write('src/b.ts', lines(100) + lines(10, 'more'));
    commit('small follow-up');
    const check = checkPr({ base, root: repo });
    expect(check.problems).toEqual([]);
    expect(check.driftLoc).toBe(10);
    expect(check.ok).toBe(true);
  });

  test('fails on an unresolved issue', () => {
    const base = startFeature();
    commitReview(['resolved', 'unresolved']);
    const check = checkPr({ base, root: repo });
    expect(check.ok).toBe(false);
    expect(check.unresolved.map(({ location }) => location)).toEqual(['src/a.ts:2']);
  });

  test('fails once drift passes 20%', () => {
    const base = startFeature();
    commitReview([]);
    write('src/c.ts', lines(40));
    commit('big follow-up');
    const check = checkPr({ base, root: repo });
    expect(check.ok).toBe(false);
    expect(check.drift).toBeCloseTo(40 / 140);
  });

  test('a merge from main is not drift', () => {
    startFeature();
    commitReview([]);
    const base = mergeMain('src/main-only.ts', lines(200, 'main'));
    const check = checkPr({ base, root: repo });
    expect(check.prLoc).toBe(100);
    expect(check.driftLoc).toBe(0);
    expect(check.ok).toBe(true);
  });

  test('passes with nothing to review', () => {
    const base = run('rev-parse', 'HEAD');
    run('checkout', '-q', '-b', 'feature');
    write('pnpm-lock.yaml', lines(50));
    commit('lockfile only');
    expect(checkPr({ base, root: repo }).ok).toBe(true);
  });
});
