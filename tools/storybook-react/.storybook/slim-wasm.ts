//
// Copyright 2026 DXOS.org
//

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ResolverFactory } from 'oxc-resolver';
import { type Plugin } from 'vite';

const storybookDir = dirname(fileURLToPath(import.meta.url));

/** Set by `storybook-react:bundle-perf`; the published `bundle` keeps the packages' own wasm init. */
export const isSlimWasm = process.env.DX_SLIM_WASM === '1' || process.env.DX_SLIM_WASM === 'true';

// Their `browser` entrypoints instantiate wasm with top-level await, which makes every importer's
// lazy init async; rolldown's emulation of async init then deadlocks on the story graph's import
// cycles (e.g. `react-ui-form`'s field dispatch, which its array field renders recursively), so
// the story never mounts. The native ESM loader `storybook dev` relies on resolves those cycles.
const SLIM_WASM_PACKAGES = ['@automerge/automerge', '@automerge/automerge-repo', '@automerge/automerge-subduction'];

/**
 * Resolves the automerge packages to `slim` (no top-level await) for a production build, as
 * composer-app's `slimWasm` does, and swaps the SDK's dedicated worker for one that initializes
 * the wasm first; the page realm initializes it in `preview.ts`.
 */
export const slimWasmPlugin = (): Plugin => {
  // `browser` is deliberately absent: a `browser`-conditioned subpath resolves to that package's
  // own wasm-initializing glue, so pinning the non-browser resolution keeps one wasm instance.
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
        if (!importer) {
          return null;
        }
        const pkg = SLIM_WASM_PACKAGES.find((name) => source === name || source.startsWith(`${name}/`));
        if (!pkg) {
          return null;
        }
        // Asset requests (`?url`) fail the resolver and fall through to vite.
        const target = source === pkg ? `${pkg}/slim` : source;
        const resolved = resolver.sync(dirname(importer), target);
        return resolved.error || !resolved.path ? null : resolved.path;
      },
    },
  };
};
