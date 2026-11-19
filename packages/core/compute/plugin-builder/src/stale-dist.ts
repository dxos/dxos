//
// Copyright 2026 DXOS.org
//

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

/** Source files whose edits never reach `dist/lib`. */
const IGNORED_SOURCE = /\.(test|stories)\.[cm]?[jt]sx?$/;

/** Mtime in ms of the newest (or oldest) file under `dir`; `undefined` if there is none. */
const extremeMtime = (dir: string, newest: boolean, ignore?: RegExp): number | undefined => {
  let result: number | undefined;
  const visit = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        visit(path);
      } else if (entry.isFile() && !ignore?.test(entry.name)) {
        const mtime = statSync(path).mtimeMs;
        result = result === undefined ? mtime : newest ? Math.max(result, mtime) : Math.min(result, mtime);
      }
    }
  };
  try {
    visit(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
  return result;
};

/**
 * Returns a one-line failure message when the package's `src/` has a file newer than the oldest file in `dist/lib`
 * (which the EDGE bundle reads), or `undefined` when `dist/lib` is fresh. A package with no `src/` or no `dist/lib`
 * has nothing to compare.
 */
export const checkStaleDist = (packageDir: string, options: { allowStale?: boolean } = {}): string | undefined => {
  if (options.allowStale) {
    return undefined;
  }
  const newestSource = extremeMtime(join(packageDir, 'src'), true, IGNORED_SOURCE);
  const oldestBuilt = extremeMtime(join(packageDir, 'dist', 'lib'), false);
  if (newestSource === undefined || oldestBuilt === undefined || newestSource <= oldestBuilt) {
    return undefined;
  }
  let name = basename(packageDir);
  try {
    name = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')).name ?? name;
  } catch {
    // Fall back to the directory name.
  }
  return `✗ ${name}: dist/lib is older than src/; run \`moon run ${basename(packageDir)}:build\` first (or pass --allow-stale).`;
};
