//
// Copyright 2026 DXOS.org
//

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ResolverFactory } from 'oxc-resolver';
import { type Plugin } from 'vite';

const storybookDir = dirname(fileURLToPath(import.meta.url));

/** Set by `storybook-react:bundle-perf`; the published `bundle` is unchanged. */
export const isPerfBundle = process.env.DX_PERF_BUNDLE === '1';

const SLIM_WASM_PACKAGES = ['@automerge/automerge', '@automerge/automerge-repo', '@automerge/automerge-subduction'];

/**
 * Makes a production build of the stories boot: the automerge packages' `browser` entrypoints instantiate
 * wasm with top-level await, which makes lazy module inits async, and rolldown's async-init emulation
 * deadlocks on the stories' import cycles. They resolve to `slim` instead (as in composer-app), and each
 * realm initializes the wasm: the page in `preview.ts`, the SDK's dedicated worker via `dedicated-worker.ts`.
 */
export const slimWasmPlugin = (): Plugin => {
  // `browser` is absent: a `browser`-conditioned subpath resolves to its own wasm-initializing glue.
  const resolver = new ResolverFactory({ conditionNames: ['source', 'import', 'module', 'default'] });
  return {
    name: 'dxos:slim-wasm',
    apply: 'build',
    enforce: 'pre',
    config: () => ({
      define: { __DX_SLIM_WASM__: 'true' },
      // An alias, not `resolveId`: Vite resolves a `new URL(<specifier>, import.meta.url)` worker
      // entry with its alias-aware resolver, which never consults plugin `resolveId` hooks.
      resolve: {
        alias: [
          { find: /^@dxos\/client\/dedicated-worker$/, replacement: resolve(storybookDir, 'dedicated-worker.ts') },
        ],
      },
    }),
    resolveId: {
      order: 'pre',
      handler: (source, importer) => {
        const pkg = SLIM_WASM_PACKAGES.find((name) => source === name || source.startsWith(`${name}/`));
        if (!importer || !pkg) {
          return null;
        }
        // Asset requests (`?url`) fail the resolver and fall through to vite.
        const resolved = resolver.sync(dirname(importer), source === pkg ? `${pkg}/slim` : source);
        return resolved.error || !resolved.path ? null : resolved.path;
      },
    },
  };
};

/** Rolldown 1.2.4 drops a lazily wrapped module's init call across chunks, so the perf build is one chunk. */
export const perfBundlePlugin = (): Plugin => ({
  name: 'dxos:perf-bundle',
  apply: 'build',
  config: () => ({ build: { rolldownOptions: { output: { codeSplitting: false } } } }),
});
