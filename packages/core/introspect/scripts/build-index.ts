//
// Copyright 2026 DXOS.org
//

// Build the on-disk symbol cache for the monorepo.
//
//   moon run introspect:index
//   # or directly:
//   pnpm exec tsx --conditions=source packages/core/introspect/scripts/build-index.ts
//
// The script walks up to find the monorepo root, creates an introspector
// with `prewarm: true, cache: true`, awaits `ready`, prints a one-line
// summary, and exits. The cache lands at `<root>/.dxos-introspect/cache.json`
// and is reused by every subsequent introspector run (MCP server, tests, etc.)
// until source files change.

import { existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createIntrospector } from '../src/index';

const findRepoRoot = (start: string): string | null => {
  let cursor = start;
  while (true) {
    if (existsSync(resolve(cursor, 'pnpm-workspace.yaml'))) {
      return cursor;
    }
    const parent = dirname(cursor);
    if (parent === cursor) {
      return null;
    }
    cursor = parent;
  }
};

const args = process.argv.slice(2);
const rootArg = (() => {
  const idx = args.indexOf('--root');
  return idx >= 0 ? args[idx + 1] : undefined;
})();

const here = dirname(fileURLToPath(import.meta.url));
const root = rootArg ? (isAbsolute(rootArg) ? rootArg : resolve(process.cwd(), rootArg)) : findRepoRoot(here);

if (!root) {
  console.error('Could not find pnpm-workspace.yaml. Pass --root explicitly.');
  process.exit(1);
}

console.error(`[build-index] root: ${root}`);
const start = Date.now();

const intro = createIntrospector({ monorepoRoot: root, prewarm: true, cache: true });
await intro.ready;

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
const packageCount = intro.listPackages().length;
console.error(`[build-index] done in ${elapsed}s — ${packageCount} packages indexed.`);
intro.dispose();
