//
// Copyright 2026 DXOS.org
//

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ResolverFactory } from 'oxc-resolver';
import { type Plugin } from 'vite';

const storybookDir = dirname(fileURLToPath(import.meta.url));

/** Set by `storybook-react:bundle-perf`, which builds one chunk; see `productionBundlePlugin`. */
const isPerfBundle = process.env.DX_PERF_BUNDLE === '1';

const SLIM_WASM_PACKAGES = ['@automerge/automerge', '@automerge/automerge-repo', '@automerge/automerge-subduction'];

/**
 * Makes a production build of the stories boot. The automerge packages' `browser` entrypoints
 * instantiate wasm with top-level await, which makes every importer's lazy module init async, and
 * rolldown's async-init emulation deadlocks on any import cycle above them (a cyclic init awaits its
 * own pending promise), leaving the story on its loading spinner. They resolve to `slim` instead (as
 * in composer-app), and each realm initializes the wasm: the page in `preview.ts`, the SDK's dedicated
 * worker via `dedicated-worker.ts`.
 *
 * The perf build is also one chunk: rolldown 1.2.4 dropped a lazily wrapped module's init call across
 * chunks, and its budgets were calibrated on that single-chunk build.
 */
export const productionBundlePlugin = (): Plugin => {
  // `browser` is absent: a `browser`-conditioned subpath resolves to its own wasm-initializing glue.
  const resolver = new ResolverFactory({ conditionNames: ['source', 'import', 'module', 'default'] });
  return {
    name: 'dxos:production-bundle',
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
      ...(isPerfBundle && { build: { rolldownOptions: { output: { codeSplitting: false } } } }),
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
