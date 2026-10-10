//
// Copyright 2026 DXOS.org
//

import { mkdirSync, mkdtempSync, readdirSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, test } from 'vitest';

import { pruneArms } from './arms.ts';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

/** A worktree whose cached arms were last used in the order given, oldest first. */
const worktree = (...names: string[]): { root: string; arm: (name: string) => string } => {
  const root = mkdtempSync(path.join(tmpdir(), 'perf-arms-'));
  roots.push(root);
  const arm = (name: string) => path.join(root, '.perf', 'arms', name);
  names.forEach((name, index) => {
    mkdirSync(arm(name), { recursive: true });
    const used = new Date(Date.UTC(2026, 9, 1, 0, index));
    utimesSync(arm(name), used, used);
  });
  return { root, arm };
};

describe('cached arms', () => {
  test('keeps the most recently used, and never an arm in use', ({ expect }) => {
    const { root, arm } = worktree('a', 'b', 'c', 'd', 'e');
    const removed = pruneArms(root, 3, [arm('a')]);
    expect(removed.map((dir) => path.basename(dir)).sort()).toEqual(['b', 'c']);
    expect(readdirSync(path.join(root, '.perf', 'arms')).sort()).toEqual(['a', 'd', 'e']);
  });

  test('a worktree that never measured has nothing to prune', ({ expect }) => {
    const root = mkdtempSync(path.join(tmpdir(), 'perf-arms-'));
    roots.push(root);
    expect(pruneArms(root, 3, [])).toEqual([]);
  });
});
