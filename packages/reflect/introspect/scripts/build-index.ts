//
// Copyright 2026 DXOS.org
//

// Build the on-disk symbol cache for the monorepo.
//
//   moon run introspect:index
//   # or directly:
//   pnpm exec tsx --conditions=source packages/reflect/introspect/scripts/build-index.ts
//
// The script walks up to find the monorepo root, creates an introspector
// with `prewarm: true, cache: true`, awaits `ready`, and writes two files:
//
//   - core.json    — symbol cache (~14 MB), reused across runs
//   - plugins.json — plugin metadata sidecar (~200 KB), regenerated every run
//
// Both land under `<root>/node_modules/.cache/dxos-introspect/`. The MCP
// edge worker reads each from R2 independently (different update cadences,
// different schema versions).

import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { createIntrospector, pluginsFilePath } from '../src';

// Bumped whenever the sidecar shape changes. Must match the worker's
// `fetchPluginsJson` version check.
// v2 (2026-05): added `idioms`.
const PLUGINS_SIDECAR_VERSION = 2;

const USAGE = [
  'Usage: build-index [options]',
  '',
  'Options:',
  '  --root <path>   Monorepo root (default: discovered from this script via pnpm-workspace.yaml)',
  '  -v, --verbose   Log per-package progress and per-phase timing',
  '  -h, --help      Show this help',
].join('\n');

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

let values: { root?: string; verbose?: boolean; help?: boolean };
try {
  ({ values } = parseArgs({
    options: {
      root: { type: 'string' },
      verbose: { type: 'boolean', short: 'v', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    strict: true,
    allowPositionals: false,
  }));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(USAGE);
  process.exit(1);
}

if (values.help) {
  console.error(USAGE);
  process.exit(0);
}

const verbose = values.verbose === true;
const log = (message: string) => console.error(`[build-index] ${message}`);
const logVerbose = (message: string) => {
  if (verbose) {
    log(message);
  }
};

const here = dirname(fileURLToPath(import.meta.url));
const root = values.root
  ? isAbsolute(values.root)
    ? values.root
    : resolve(process.cwd(), values.root)
  : findRepoRoot(here);

if (!root) {
  console.error('Could not find pnpm-workspace.yaml. Pass --root explicitly.');
  process.exit(1);
}

log(`root: ${root}`);
logVerbose('options: prewarm=true cache=true');
const start = Date.now();

const intro = createIntrospector({ rootPath: root, prewarm: true, cache: true });

const readyAt = verbose ? Date.now() : 0;
await intro.ready;
if (verbose) {
  logVerbose(`ready in ${((Date.now() - readyAt) / 1000).toFixed(1)}s`);
}

const packages = intro.listPackages();
if (verbose) {
  for (const pkg of packages) {
    logVerbose(`indexed ${pkg.name}`);
  }
}

// Write the plugin metadata sidecar. Atomic rename — same convention as
// saveCache. Worker reads `{plugins, surfaces, capabilities, operations,
// schemas, idioms}` directly off R2; keep the keys identical.
const pluginsPath = pluginsFilePath(root);
const pluginsTmp = `${pluginsPath}.tmp`;
mkdirSync(dirname(pluginsPath), { recursive: true });
const sidecar = {
  version: PLUGINS_SIDECAR_VERSION,
  plugins: intro.listPlugins(),
  surfaces: intro.listSurfaces(),
  capabilities: intro.listCapabilities(),
  operations: intro.listOperations(),
  schemas: intro.listSchemas(),
  idioms: intro.listIdioms(),
};
writeFileSync(pluginsTmp, JSON.stringify(sidecar));
renameSync(pluginsTmp, pluginsPath);
log(
  `wrote plugins sidecar: ${sidecar.plugins.length} plugins, ${sidecar.surfaces.length} surfaces, ${sidecar.capabilities.length} capabilities, ${sidecar.operations.length} operations, ${sidecar.schemas.length} schemas, ${sidecar.idioms.length} idioms → ${pluginsPath}`,
);

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
log(`done in ${elapsed}s — ${packages.length} packages indexed.`);
intro.dispose();
