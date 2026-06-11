//
// Copyright 2026 DXOS.org
//

import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getMainWorktree, prepareCanonicalDist } from './canonical-dist.mjs';

/**
 * Ensure Chrome's fixed "Load unpacked" path is a real directory before bundle/serve.
 *
 * Chrome cannot load an unpacked extension when the root path is a symlink (manifest paths fail
 * to resolve). Linked worktrees therefore emit build output directly into the main checkout's
 * gitignored `dist` via Vite `build.outDir`; this task only prepares that directory.
 */

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mainWorktree = getMainWorktree(projectRoot);
const localDist = join(projectRoot, 'dist');
const canonicalDist = prepareCanonicalDist(projectRoot);

if (resolve(localDist) === resolve(canonicalDist)) {
  console.log('[prepare-dist] building in the main worktree; canonical dist path is already the build output.');
} else {
  console.log(`[prepare-dist] canonical dist: ${relative(mainWorktree, canonicalDist)}`);
}
