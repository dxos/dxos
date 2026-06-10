//
// Copyright 2026 DXOS.org
//

import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Point a deterministic, worktree-independent path at this worktree's freshly built CRX bundle so
 * Chrome's "Load unpacked" target never changes.
 *
 * Chrome remembers the absolute path of an unpacked extension. In a git worktree the project lives
 * under `.claude/worktrees/<name>/...`, so that path changes per worktree and Chrome would need to
 * be re-pointed every time. Instead we keep Chrome pointed at the MAIN worktree's
 * `packages/apps/composer-crx/dist` and, when building inside a linked worktree, replace that path
 * with a symlink to the active worktree's `dist`. The `dist` directory is gitignored, so swapping
 * the main checkout's real `dist` for a symlink never dirties the working tree.
 *
 * No-op when run from the main worktree itself (the canonical path already is the build output).
 */

// `scripts/` lives directly under the composer-crx project root.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Absolute path of the main (primary) worktree — always the first entry of `git worktree list`. */
const mainWorktree = (() => {
  const output = execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd: projectRoot, encoding: 'utf8' });
  const first = output.split('\n').find((line) => line.startsWith('worktree '));
  if (!first) {
    throw new Error('Unable to determine the main worktree from `git worktree list`.');
  }
  return first.slice('worktree '.length).trim();
})();

const currentDist = join(projectRoot, 'dist');
const mainDist = join(mainWorktree, 'packages', 'apps', 'composer-crx', 'dist');

if (resolve(currentDist) === resolve(mainDist)) {
  console.log('[link-dist] building in the main worktree; canonical dist path is already the build output.');
  process.exit(0);
}

// Ensure the link target exists so the symlink is not dangling (typecheck `build` runs before any
// bundle has been written; `bundle`/`serve` populate it afterwards).
if (!existsSync(currentDist)) {
  mkdirSync(currentDist, { recursive: true });
}

// Remove whatever is at the canonical path (a real dir from a prior main build, or a stale symlink
// to another worktree) and replace it with a fresh symlink to this worktree's dist.
if (existsSync(mainDist) || isSymlink(mainDist)) {
  rmSync(mainDist, { recursive: true, force: true });
}
symlinkSync(currentDist, mainDist, 'dir');

console.log(`[link-dist] linked ${relative(mainWorktree, mainDist)} -> ${currentDist}`);

/** Whether a path is a symlink (including a dangling one, which `existsSync` reports as missing). */
function isSymlink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}
