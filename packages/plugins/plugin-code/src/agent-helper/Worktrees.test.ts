//
// Copyright 2026 DXOS.org
//

import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Worktrees from './Worktrees.ts';

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.com', ...args], {
    cwd,
    encoding: 'utf8',
  }).trim();

const exists = (path: string) =>
  stat(path).then(
    () => true,
    () => false,
  );

describe('Worktrees', () => {
  let dir: string;
  let repository: string;
  let context: Worktrees.Context;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'dx-worktrees-'));
    repository = join(dir, 'repo');
    await mkdir(repository);
    git(repository, 'init', '-q', '-b', 'main');
    git(repository, 'commit', '-q', '--allow-empty', '-m', 'init');
    context = {
      root: join(dir, 'worktrees'),
      path: [dirname(execFileSync('which', ['git'], { encoding: 'utf8' }).trim())],
    };
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test('creates a worktree on a new branch, and returns the same one after', async ({ expect }) => {
    const first = await Worktrees.ensure(context, { repository, key: 'space_chat', branch: 'composer/fix-1' });
    expect(first).toEqual({ key: 'space_chat', path: join(context.root, 'space_chat'), branch: 'composer/fix-1' });
    expect(git(first.path, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('composer/fix-1');

    expect(await Worktrees.ensure(context, { repository, key: 'space_chat', branch: 'composer/other' })).toEqual(first);
    expect(await Worktrees.list(context)).toEqual([first]);
  });

  test('removes a clean worktree and keeps its branch, but keeps one with changes', async ({ expect }) => {
    const clean = await Worktrees.ensure(context, { repository, key: 'clean', branch: 'composer/clean' });
    const dirty = await Worktrees.ensure(context, { repository, key: 'dirty', branch: 'composer/dirty' });
    await writeFile(join(dirty.path, 'note.txt'), 'unsaved work');

    expect(await Worktrees.remove(context, 'clean')).toBe('removed');
    expect(await exists(clean.path)).toBe(false);
    expect(git(repository, 'branch', '--list', 'composer/clean')).toContain('composer/clean');

    expect(await Worktrees.remove(context, 'dirty')).toBe('dirty');
    expect(await exists(dirty.path)).toBe(true);
    expect(await Worktrees.remove(context, 'never')).toBe('missing');
  });

  test('checks out a branch that already exists rather than failing', async ({ expect }) => {
    await Worktrees.ensure(context, { repository, key: 'once', branch: 'composer/again' });
    await Worktrees.remove(context, 'once');
    const again = await Worktrees.ensure(context, { repository, key: 'once', branch: 'composer/again' });
    expect(git(again.path, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('composer/again');
  });

  test('a folder inside the repository maps to the same folder in the worktree', async ({ expect }) => {
    const nested = join(repository, 'packages', 'app');
    await mkdir(nested, { recursive: true });
    await writeFile(join(nested, 'index.ts'), '');
    git(repository, 'add', '.');
    git(repository, 'commit', '-q', '-m', 'app');

    const worktree = await Worktrees.ensure(context, { repository: nested, key: 'nested', branch: 'composer/nested' });
    expect(worktree.path).toBe(join(context.root, 'nested', 'packages', 'app'));
    expect(await exists(join(worktree.path, 'index.ts'))).toBe(true);
    expect((await Worktrees.ensure(context, { repository: nested, key: 'nested', branch: 'x' })).path).toBe(
      worktree.path,
    );
  });

  test('works in a folder that is not a repository as it is', async ({ expect }) => {
    const plain = join(dir, 'plain');
    await mkdir(plain);
    expect(await Worktrees.ensure(context, { repository: plain, key: 'plain', branch: 'composer/x' })).toEqual({
      key: 'plain',
      path: plain,
      branch: '',
    });
  });

  test('refuses keys and branches that could escape or mislead', async ({ expect }) => {
    await expect(Worktrees.ensure(context, { repository, key: '../up', branch: 'composer/x' })).rejects.toThrow(
      Worktrees.WorktreeError,
    );
    await expect(Worktrees.ensure(context, { repository, key: 'ok', branch: '--force' })).rejects.toThrow(
      Worktrees.WorktreeError,
    );
    await expect(Worktrees.remove(context, '../repo')).rejects.toThrow(Worktrees.WorktreeError);
  });
});
