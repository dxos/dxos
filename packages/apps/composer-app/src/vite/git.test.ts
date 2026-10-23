//
// Copyright 2026 DXOS.org
//

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, test } from 'vitest';

import { gitShow, gitStatus, isCommit } from './git.ts';

describe('git route', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'dx-git-'));
  const git = (...args: string[]) =>
    execFileSync('git', ['-C', root, '-c', 'user.name=test', '-c', 'user.email=test@example.com', ...args], {
      encoding: 'utf8',
    }).trim();
  const spec = path.join(root, 'SPEC.mdl');
  git('init', '-q', '-b', 'main');
  writeFileSync(spec, 'base\n');
  git('add', '.');
  git('commit', '-q', '-m', 'base');
  const forkPoint = git('rev-parse', 'HEAD');
  git('checkout', '-q', '-b', 'feature');
  writeFileSync(spec, 'committed\n');
  git('commit', '-q', '-am', 'feature');
  const head = git('rev-parse', 'HEAD');
  writeFileSync(spec, 'uncommitted\n');

  afterAll(() => rmSync(root, { recursive: true, force: true }));

  test('a branch is compared with where it forked from the default branch', async ({ expect }) => {
    // No remote, so no pull request lookup reaches GitHub.
    expect(await gitStatus(spec, {})).toEqual({ branch: 'feature', head, base: 'main', mergeBase: forkPoint });
  });

  test('a file reads back at the fork point and at HEAD', async ({ expect }) => {
    expect(await gitShow(spec, forkPoint)).toBe('base\n');
    expect(await gitShow(spec, head)).toBe('committed\n');
    expect(await gitShow(path.join(root, 'NEW.mdl'), head)).toBeUndefined();
  });

  test('only commit ids are accepted as revisions', async ({ expect }) => {
    expect(isCommit(head)).toBe(true);
    expect(isCommit('--output=/tmp/x')).toBe(false);
    expect(isCommit('HEAD~1')).toBe(false);
    await expect(gitShow(spec, '--help')).rejects.toThrow();
  });

  test('a file outside any repository has no status', async ({ expect }) => {
    const outside = mkdtempSync(path.join(tmpdir(), 'dx-nogit-'));
    try {
      expect(await gitStatus(path.join(outside, 'SPEC.mdl'), {})).toBeUndefined();
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
