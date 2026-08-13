//
// Copyright 2026 DXOS.org
//

// Regenerates `src/vite/optimize-deps.ts` — the static `optimizeDeps.include` list.
//
// Starts a `vite serve` against a throwaway cache dir so the dependency scan actually runs (vite
// skips the scan whenever a valid cache exists), then writes every entrypoint the scan resolved.
// Reads the optimizer's own state rather than the cache's `_metadata.json`, so it does not have to
// wait for the (minutes-long) pre-bundle that follows. Usage: `moon run composer-app:gen-optimize-deps`.

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogger, createServer } from 'vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, '..');
const target = path.join(root, 'src/vite/optimize-deps.ts');

const cacheDir = mkdtempSync(path.join(tmpdir(), 'composer-optimize-deps-'));

// A port nothing else is expected to be serving on; the scan runs on `listen`, and nothing connects.
const PORT = 5399;

/** Nearest enclosing package name, i.e. which package a scanned import was reached through. */
const owningPackage = (file) => {
  for (let dir = path.dirname(file); dir !== path.dirname(dir); dir = path.dirname(dir)) {
    try {
      return JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')).name;
    } catch {
      continue;
    }
  }
};

/** Package name a bare specifier belongs to, dropping any subpath. */
const packageName = (id) => id.split('/', id[0] === '@' ? 2 : 1).join('/');

// The scan resolves each dep from whichever module imported it; `include` resolves from the app
// root, where a dep reached only through a `@dxos/*` package is not visible under pnpm. Recording
// importers lets those be listed in vite's nested `parent > … > child` form instead of dropped.
const importers = new Map();
const recordImporters = {
  name: 'record-dep-importers',
  resolveId(id, importer) {
    if (importer && /^[\w@][^:]/.test(id)) {
      importers.get(id)?.add(importer) ?? importers.set(id, new Set([importer]));
    }
  },
};

// A crawl that fails to resolve one import aborts the whole scan, leaving only the list this run
// regenerates — which would then rewrite itself from its own stale input. Fail instead.
let scanFailure;
const logger = createLogger();

const server = await createServer({
  root,
  configFile: path.join(root, 'vite.config.ts'),
  cacheDir,
  optimizeDeps: { rolldownOptions: { plugins: [recordImporters] } },
  server: { port: PORT, strictPort: true, host: false, hmr: false },
  customLogger: {
    ...logger,
    error: (message, options) => {
      if (message.includes('Failed to run dependency scan')) {
        scanFailure = message;
      }
      logger.error(message, options);
    },
  },
});

let deps;
try {
  await server.listen();
  const optimizer = server.environments.client.depsOptimizer;
  if (!optimizer) {
    throw new Error('dependency optimization is disabled; nothing to generate.');
  }

  // Resolves once the scan has crawled every entry and folded its result into `discovered`.
  await optimizer.scanProcessing;
  if (scanFailure) {
    throw new Error('dependency scan failed, so the list would only mirror itself; fix the imports above.');
  }

  const { optimized, discovered } = optimizer.metadata;
  // Deps carried over from the list this run regenerates are keyed in nested form; strip it so the
  // parent is re-derived from this scan rather than compounding.
  const scanned = [
    ...new Set(
      [...Object.keys(optimized), ...Object.keys(discovered)].map((id) => id.slice(id.lastIndexOf('>') + 1).trim()),
    ),
  ].sort();

  const { pluginContainer } = server.environments.client;
  const rootImporter = path.join(root, 'index.html');
  // A package whose export conditions do not match throws rather than resolving to nothing.
  const resolvesFromRoot = async (id) => {
    try {
      return !!(await pluginContainer.resolveId(id, rootImporter, { scan: true }));
    } catch {
      return false;
    }
  };

  // Package-level import graph, from which a chain of `>` hops down to an otherwise invisible dep
  // is read off. Sorted so the chain chosen for a dep with several importers does not vary by run.
  const graph = new Map();
  for (const [id, files] of importers) {
    for (const file of files) {
      const parent = owningPackage(file);
      if (parent) {
        graph.get(parent)?.add(packageName(id)) ?? graph.set(parent, new Set([packageName(id)]));
      }
    }
  }

  const app = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).name;
  const chains = new Map([[app, []]]);
  for (let frontier = [app]; frontier.length > 0;) {
    const next = [];
    for (const parent of frontier) {
      for (const child of [...(graph.get(parent) ?? [])].sort()) {
        if (!chains.has(child)) {
          chains.set(child, [...chains.get(parent), child]);
          next.push(child);
        }
      }
    }
    frontier = next;
  }

  const dropped = [];
  deps = (
    await Promise.all(
      scanned.map(async (dep) => {
        if (await resolvesFromRoot(dep)) {
          return dep;
        }
        const owners = [...new Set([...(importers.get(dep) ?? [])].map(owningPackage).filter(Boolean))]
          .filter((owner) => chains.has(owner))
          .sort((a, b) => chains.get(a).length - chains.get(b).length || a.localeCompare(b));
        if (owners.length > 0) {
          return [...chains.get(owners[0]), dep].join(' > ');
        }
        dropped.push(dep);
      }),
    )
  )
    .filter(Boolean)
    .sort();

  if (dropped.length > 0) {
    console.log(`Dropped ${dropped.length} dep(s) with no root-resolvable owner: ${dropped.join(', ')}`);
  }
} finally {
  await server.close();
  rmSync(cacheDir, { recursive: true, force: true });
}

writeFileSync(
  target,
  `//
// Copyright 2026 DXOS.org
//

// GENERATED FILE — regenerate with \`moon run composer-app:gen-optimize-deps\`.

/**
 * Every dependency entrypoint the app reaches, pre-bundled by vite's optimizer up front.
 *
 * Vite's dependency scan is all-or-nothing — one unresolvable import anywhere in the crawl aborts
 * it and pre-bundles nothing — and it runs only when there is no valid optimizer cache, so the
 * damage outlives the start that caused it: every dep is then discovered mid-session, one
 * re-optimize and full page reload per plugin family. Listing the deps statically keeps
 * pre-bundling independent of the scan. Entries reached only through a \`@dxos/*\` package do not
 * resolve from the app root under pnpm, so they take vite's nested \`parent > child\` form.
 */
export const optimizeDepsInclude: string[] = [
${deps.map((dep) => `  '${dep}',`).join('\n')}
];
`,
);

console.log(`Wrote ${deps.length} entries to ${path.relative(root, target)}`);
process.exit(0);
