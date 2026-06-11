//
// Copyright 2026 DXOS.org
//

import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Absolute path of the main (primary) worktree — always the first entry of `git worktree list`.
 *
 * @param {string} cwd
 */
export const getMainWorktree = (cwd) => {
  const output = execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd, encoding: 'utf8' });
  const first = output.split('\n').find((line) => line.startsWith('worktree '));
  if (!first) {
    throw new Error('Unable to determine the main worktree from `git worktree list`.');
  }
  return first.slice('worktree '.length).trim();
};

/**
 * Chrome's "Load unpacked" target: main checkout `packages/apps/composer-crx/dist`.
 * When building from a linked worktree, Vite writes here directly (Chrome cannot load an
 * extension whose root directory is a symlink).
 *
 * @param {string} projectRoot
 */
export const getCanonicalDistPath = (projectRoot) => {
  const localDist = join(projectRoot, 'dist');
  const mainDist = join(getMainWorktree(projectRoot), 'packages', 'apps', 'composer-crx', 'dist');
  if (resolve(localDist) === resolve(mainDist)) {
    return localDist;
  }
  return mainDist;
};

/**
 * Ensure the canonical dist path is a real directory Vite can write to.
 *
 * @param {string} projectRoot
 */
export const prepareCanonicalDist = (projectRoot) => {
  const canonicalDist = getCanonicalDistPath(projectRoot);
  const localDist = join(projectRoot, 'dist');
  if (resolve(canonicalDist) === resolve(localDist)) {
    return canonicalDist;
  }

  const stat = statWithoutFollow(canonicalDist);
  if (stat?.isSymbolicLink()) {
    // Prior runs symlinked the canonical path; Chrome rejects that layout.
    unlinkSync(canonicalDist);
  } else if (stat?.isFile()) {
    unlinkSync(canonicalDist);
  }

  if (!existsSync(canonicalDist)) {
    mkdirSync(canonicalDist, { recursive: true });
  }

  return canonicalDist;
};

/** @param {string} path */
function statWithoutFollow(path) {
  try {
    return lstatSync(path);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}
