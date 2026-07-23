//
// Copyright 2025 DXOS.org
//

import { minimatch as Minimatch } from 'minimatch';
import { ResolverFactory } from 'oxc-resolver';
import { type Plugin, type ResolvedConfig } from 'vite';

interface PluginImportSourceOptions {
  /**
   * Package patterns to include for 'source' condition resolution.
   * @default ['@dxos/**']
   */
  include?: string[];
  /**
   * Package patterns to exclude from 'source' condition resolution.
   * @default []
   */
  exclude?: string[];
  verbose?: boolean;
}

/**
 * Prefer "source" condition for specifc packages.
 */
const PluginImportSource = ({
  include = ['@dxos/**'],
  exclude = [],
  verbose = process.env.IMPORT_SOURCE_DEBUG === '1' || process.env.IMPORT_SOURCE_DEBUG === 'true',
}: PluginImportSourceOptions = {}): Plugin => {
  let resolver: ResolverFactory;

  // Each `addWatchFile` below registers a per-file libuv `fs_event` watcher that Vite never
  // releases on close. Under Vitest the Storybook builder runs in-process where neither
  // `server.watch` nor an argv run-mode check is reliably set, so those watchers leak and hang
  // single-pass `vitest run` teardown (the main process never exits). Vitest manages its own file
  // watching, so skip registration entirely when running under it — `VITEST` is exported to the
  // whole process tree (workers and child loaders included); interactive `storybook dev` / `vite
  // dev` have `VITEST` unset and keep HMR.
  const isVitest = process.env.VITEST === 'true';

  // `nocomment: true` keeps Minimatch from treating leading `#` (used for Node
  // subpath imports like `#diagnostics-broadcast`) as a comment pattern that
  // matches nothing.
  const globOptions = { dot: true, nocomment: true };
  const isMatch = (filePath: string) =>
    include.some((pattern) => Minimatch(filePath, pattern, globOptions)) &&
    !exclude.some((pattern) => Minimatch(filePath, pattern, globOptions));

  return {
    name: 'plugin-import-source',

    configResolved: (config: ResolvedConfig) => {
      // Get Vite's conditions and prepend 'source'.
      const viteConditions = config.resolve.conditions ?? [];
      const conditionNames = ['source', ...viteConditions];

      verbose && console.log(`[plugin-import-source] Using conditions: ${conditionNames.join(', ')}`);
      verbose && console.log(`[plugin-import-source] Include: ${include.join(', ')}`);
      verbose && console.log(`[plugin-import-source] Exclude: ${exclude.join(', ')}`);

      // Create resolver with 'source' prepended to Vite's conditions.
      resolver = new ResolverFactory({ conditionNames });
    },

    resolveId: {
      order: 'pre',
      async handler(source, importer) {
        // Check if source looks like an npm package name or a subpath import (#).
        if (!source.match(/^[a-zA-Z@#][a-zA-Z0-9._-]*(\/[a-zA-Z0-9._-]+)*$/)) {
          return null; // Skip to next resolver.
        }

        // Filter by package name pattern before resolving. nocomment: minimatch
        // treats '#'-prefixed patterns as comments by default, which breaks
        // subpath-import patterns like '#*'.
        const match =
          include.some((pattern) => Minimatch(source, pattern, globOptions)) &&
          !exclude.some((pattern) => Minimatch(source, pattern, globOptions));

        if (!match) {
          verbose && console.log(`[plugin-import-source] ${source} -> excluded`);
          return null;
        }

        if (!importer) {
          return null;
        }

        // Don't re-route `#*` subpath imports to source when the importer
        // is already in a compiled `dist/` tree. Compiled packages expect
        // their own subpath imports to stay on the dist→dist chain;
        // jumping back to source would pull in TypeScript that may not be
        // browser-safe (e.g. raw `node:path` in `random-access-storage`'s
        // src). Non-subpath `@dxos/*` imports from dist are unaffected —
        // they still benefit from source resolution.
        if (source.startsWith('#') && importer.includes('/dist/')) {
          return null;
        }

        try {
          const resolved = await resolver.async(importer, source);

          if (resolved.error || !resolved.path) {
            return null;
          }

          // See `isVitest` above: skip watch registration under Vitest to avoid leaking `fs_event`
          // handles that hang teardown.
          if (!isVitest) {
            if (resolved.packageJsonPath) {
              this.addWatchFile(resolved.packageJsonPath);
            }

            this.addWatchFile(resolved.path);
          }
          verbose && console.log(`[plugin-import-source] ${source} -> ${resolved.path}`);
          return resolved.path;
        } catch (error) {
          verbose && console.error('[plugin-import-source]', error);
          return null;
        }
      },
    },

    // NOTE: A previous version called `this.addWatchFile(filePath)` here for
    // every loaded module. Vite already watches resolved files; the redundant
    // calls flooded chokidar with thousands of registrations on cold start
    // (one per file, including non-`@dxos/*` modules — the include filter
    // only runs in resolveId), turning warm starts into multi-minute hangs
    // when the watcher backend falls back to polling. Watches added in
    // `resolveId` (above) for resolved package paths are sufficient to pick
    // up source changes when condition resolution would shift.
  };
};

export default PluginImportSource;
export type { PluginImportSourceOptions };
