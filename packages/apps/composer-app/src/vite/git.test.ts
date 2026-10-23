//
// Copyright 2026 DXOS.org
//

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, test } from 'vitest';

import { createGitReader, isCommit } from './git.ts';

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

  // No GITHUB_TOKEN and no GitHub remote, so no pull-request lookup reaches GitHub.
  const reader = createGitReader({});

  afterAll(() => rmSync(root, { recursive: true, force: true }));

  test('a branch is compared with where it forked from the default branch', async ({ expect }) => {
    expect(await reader.status(spec)).toEqual({ branch: 'feature', head, base: 'main', mergeBase: forkPoint });
  });

  test('a file reads back at the fork point and at HEAD', async ({ expect }) => {
    expect(await reader.show(spec, forkPoint)).toBe('base\n');
    expect(await reader.show(spec, head)).toBe('committed\n');
    expect(await reader.show(path.join(root, 'NEW.mdl'), head)).toBeUndefined();
  });

  test('a commit the repository does not have fails rather than reading as an empty file', async ({ expect }) => {
    await expect(reader.show(spec, '0'.repeat(40))).rejects.toThrow();
  });

  test('only commit ids are accepted as revisions', async ({ expect }) => {
    expect(isCommit(head)).toBe(true);
    expect(isCommit('--output=/tmp/x')).toBe(false);
    expect(isCommit('HEAD~1')).toBe(false);
    await expect(reader.show(spec, '--help')).rejects.toThrow();
  });

  test('a checkout with no base branch offers no fork point', async ({ expect }) => {
    const lone = mkdtempSync(path.join(tmpdir(), 'dx-git-lone-'));
    try {
      const run = (...args: string[]) =>
        execFileSync('git', ['-C', lone, '-c', 'user.name=test', '-c', 'user.email=test@example.com', ...args]);
      run('init', '-q', '-b', 'topic');
      writeFileSync(path.join(lone, 'SPEC.mdl'), 'spec\n');
      run('add', '.');
      run('commit', '-q', '-m', 'only');
      const status = await reader.status(path.join(lone, 'SPEC.mdl'));
      expect(status?.branch).toBe('topic');
      expect(status?.mergeBase).toBeUndefined();
    } finally {
      rmSync(lone, { recursive: true, force: true });
    }
  });

  test('a file outside any repository has no status', async ({ expect }) => {
    const outside = mkdtempSync(path.join(tmpdir(), 'dx-nogit-'));
    try {
      expect(await reader.status(path.join(outside, 'SPEC.mdl'))).toBeUndefined();
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
