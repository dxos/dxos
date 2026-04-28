//
// Copyright 2026 DXOS.org
//

import { type Plugin as VitePlugin } from 'vite';
import cssInjectedByJs from 'vite-plugin-css-injected-by-js';

import { type Plugin } from '../../core';
import { MANIFEST_ASSET_NAME, serializeManifest } from '../manifest';
import { DEFAULT_PACKAGES, isSharedPackage } from '../packages';

export { MANIFEST_ASSET_NAME, serializeManifest };

const JSX_DEV_RUNTIME = 'react/jsx-dev-runtime';

const DEFAULT_MODULE_FILE = 'plugin.mjs';

/**
 * Whether an import should be externalized by the plugin bundle.
 * Uses the shared-package predicate directly so plugins automatically pick up any
 * new `@dxos/*` (non-plugin) package the host provides, without a code change here.
 */
const isExternal = (id: string) => id !== JSX_DEV_RUNTIME && isSharedPackage(id);

/**
 * Banner injected at the top of every plugin bundle.
 *
 * Why: rolldown emits ESM `import` for externalized deps, but when a *bundled* module
 * is CJS and contains `require('react')` (or any other external), rolldown keeps the
 * `require(...)` call in the output and relies on a runtime `require` function. The
 * browser doesn't have `require`, so rolldown's fallback shim throws:
 * `Calling `require` for "react" in an environment that doesn't expose the `require`
 *  function`.
 *
 * The full dependency graphs of non-trivial plugins unavoidably drag in CJS-only
 * helpers (`use-sync-external-store` via xstate / zustand / preact-signals / … ),
 * and waiting for every one of those packages to ship ESM isn't realistic. Instead
 * we install a tiny module-local `require` at the top of the bundle that looks up
 * a handful of well-known host-provided modules by name and returns their already
 * ESM-imported namespaces. Rolldown's own shim honours an existing `require`
 * before falling through to the throw path, so this entirely removes the runtime
 * error without changing how externalization itself works.
 *
 * Keep the list aligned with the externals that CJS code actually reaches for;
 * adding entries here is safe (unused imports get tree-shaken), but the list is
 * deliberately small to keep the banner noise-free.
 */
const REQUIRE_SHIM_BANNER = [
  '// --- composer-plugin: CJS require shim ---',
  '// See @dxos/app-framework/vite-plugin/composer-plugin.ts for rationale.',
  "import * as __composerReact from 'react';",
  "import * as __composerReactDom from 'react-dom';",
  "import * as __composerReactJsxRuntime from 'react/jsx-runtime';",
  'const __composerRequireShim = new Map([',
  "  ['react', __composerReact.default ?? __composerReact],",
  "  ['react-dom', __composerReactDom.default ?? __composerReactDom],",
  "  ['react/jsx-runtime', __composerReactJsxRuntime],",
  ']);',
  "// Module-local binding: rolldown's CJS fallback does a `typeof require` check",
  '// and uses whichever `require` is in lexical scope. Declaring this as `const`',
  "// (instead of `globalThis.require ??=`) keeps each bundle's shim isolated from",
  '// the host page and from other plugins sharing the window.',
  'const require = (id) => {',
  '  if (__composerRequireShim.has(id)) return __composerRequireShim.get(id);',
  "  throw new Error('composer-plugin: unsupported CJS require at runtime: ' + id);",
  '};',
  '// --- end CJS require shim ---',
].join('\n');

export type ComposerPluginOptions = {
  /** Entry point for the plugin bundle. Defaults to `src/plugin.tsx`. */
  entry?: string;
  /** Dev server port. Defaults to `3967`. */
  port?: number;
  /**
   * Plugin metadata. When provided, a `manifest.json` asset is emitted alongside the bundle
   * so the output directory can be uploaded directly as a GitHub Release and picked up by
   * the DXOS community registry.
   */
  meta?: Plugin.Meta;
  /** Filename of the built module asset that the registry will load. Defaults to `plugin.mjs`. */
  moduleFile?: string;
};

/**
 * Vite plugin for **external Composer plugin projects**. Configures the build to produce
 * an ESM bundle that externalizes all framework dependencies, which the Composer host app
 * provides at runtime via import map.
 *
 * Handles:
 * 1. Build config — lib mode entry point, ES format output, rollup externals.
 * 2. Dev externalization — marks shared deps as external during `vite serve` and strips
 *    the `/@id/` prefix that Vite's import analysis adds to external bare specifiers.
 * 3. JSX dev runtime shim — bridges `react/jsx-dev-runtime` (used by React refresh in dev)
 *    to `react/jsx-runtime` (which is what the externalized React provides).
 * 4. Optional manifest emit — when `meta` is supplied, writes `manifest.json` next to the
 *    bundled module so a GitHub Release can carry both artifacts.
 */
export const composerPlugin = (options?: ComposerPluginOptions): VitePlugin[] => {
  const entry = options?.entry ?? 'src/plugin.tsx';
  const port = options?.port ?? 3967;
  const moduleFile = options?.moduleFile ?? DEFAULT_MODULE_FILE;
  const meta = options?.meta;
  const resolved = new Set<string>();
  let base = '/';

  const plugins: VitePlugin[] = [
    // Inline every imported stylesheet into the bundled module. Each community plugin
    // is distributed as a single GitHub Release asset (per {@link moduleFile}); a sibling
    // `.css` file would silently be dropped at runtime because Composer only fetches the
    // module URL the registry advertises.
    // TODO(wittjosiah): Once the registry supports multi-asset releases, move CSS (and
    // fonts/images/wasm) back to sibling assets so plugins don't ship stylesheets inside
    // their JS bundle.
    ...cssInjectedByJs(),

    // Configure vite for library-mode builds with externalized deps.
    {
      name: 'composer-plugin',
      config: () => ({
        server: {
          port,
          // Allow the Composer host (different origin) to dynamically import plugin modules.
          cors: true,
        },
        preview: { port },
        build: {
          sourcemap: true,
          // Transitively-bundled WASM modules (automerge, tiktoken, …) emit top-level
          // await; `esnext` lets rolldown pass that through without an explicit polyfill.
          target: 'esnext',
          lib: {
            entry,
            formats: ['es'],
            fileName: () => moduleFile,
          },
          // Inline every asset as a data URL. GitHub Releases sign each asset with a
          // per-file URL, so sibling-file imports from the plugin module can't resolve.
          // TODO(wittjosiah): Drop once the registry can serve multi-asset releases and
          // plugins can ship fonts/images/wasm as siblings of plugin.mjs.
          assetsInlineLimit: () => true,
          rolldownOptions: {
            external: (id: string) => isExternal(id),
            output: {
              // Produce a single bundle per plugin for GitHub Release distribution.
              // TODO(wittjosiah): Drop once the registry can serve multi-asset releases.
              inlineDynamicImports: true,
              // Install the CJS require shim at the top of plugin.mjs so transitively
              // bundled CJS helpers (that call `require('react')` et al. at runtime) can
              // resolve against the host-provided externals instead of throwing.
              banner: REQUIRE_SHIM_BANNER,
            },
          },
        },
      }),
    },

    // Dev-time externalization.
    // Vite's dev server doesn't use rollup externals, so we need to handle it manually.
    // We intercept imports of shared deps at resolve time, mark them external, and then
    // strip the `/@id/` prefix that Vite's import analysis injects for external modules.
    {
      name: 'composer-plugin:externalize',
      enforce: 'pre',
      apply: 'serve',
      // Exclude shared packages from Vite's dependency pre-bundling.
      config: () => ({
        optimizeDeps: {
          exclude: DEFAULT_PACKAGES,
        },
      }),
      // Mark shared deps as external so Vite doesn't try to bundle them.
      resolveId: (id) => {
        if (isExternal(id)) {
          resolved.add(id);
          return { id, external: true };
        }
      },
      // Return a stub for any externalized module that Vite tries to load directly.
      load: (id) => {
        if (resolved.has(id)) {
          return { code: 'export default {};' };
        }
      },
      // After all plugins are resolved, inject a late-stage transform plugin that strips
      // the `/@id/` prefix from externalized bare specifiers in the output.
      // This must run after Vite's internal import analysis which rewrites bare specifiers.
      configResolved: (config) => {
        base = config.base ?? '/';
        (config.plugins as VitePlugin[]).push({
          name: 'composer-plugin:strip-prefix',
          transform: (code: string) => {
            if (resolved.size === 0) {
              return;
            }
            const escaped = [...resolved].map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
            const pattern = new RegExp(`${base}@id/(${escaped})`, 'g');
            if (pattern.test(code)) {
              return code.replace(pattern, (_: string, dep: string) => dep);
            }
          },
        });
      },
    },

    // JSX dev runtime shim.
    // React refresh (used by @vitejs/plugin-react) imports from `react/jsx-dev-runtime`,
    // but the externalized React only exposes `react/jsx-runtime`. This virtual module
    // bridges the gap by re-exporting jsx-runtime's functions under jsx-dev-runtime's API.
    {
      name: 'composer-plugin:jsx-dev-shim',
      enforce: 'pre',
      apply: 'serve',
      resolveId: (id) => (id === JSX_DEV_RUNTIME ? `\0${JSX_DEV_RUNTIME}` : undefined),
      load: (id) =>
        id === `\0${JSX_DEV_RUNTIME}`
          ? [
              'import { jsx, jsxs, Fragment } from "react/jsx-runtime";',
              'export { Fragment };',
              'export function jsxDEV(type, props, key, isStaticChildren) {',
              '  return isStaticChildren ? jsxs(type, props, key) : jsx(type, props, key);',
              '}',
            ].join('\n')
          : undefined,
    },

    // React Refresh preamble stub.
    //
    // @vitejs/plugin-react's JSX transform prepends a runtime check to every module:
    //   if (!window.$RefreshReg$) throw new Error("@vitejs/plugin-react can't detect preamble…");
    // In a normal single-origin app, vite injects a `<script type="module">` preamble
    // into `index.html` that sets up `$RefreshReg$` / `$RefreshSig$` on `window` before any
    // app code runs. When a community plugin is dev-served at its own origin and then
    // dynamic-imported into the Composer host at a different origin, the host's window
    // never receives that preamble, so every JSX module throws on first import.
    //
    // Inject a no-op refresh shim on the host's window from the plugin's entrypoint: fast-
    // refresh itself doesn't work cross-origin anyway, so silencing the check lets the
    // plugin load and ordinary page reloads take care of picking up edits. Production
    // builds are untouched (`apply: 'serve'`).
    {
      name: 'composer-plugin:react-refresh-shim',
      enforce: 'pre',
      apply: 'serve',
      transform(code, id) {
        // Only patch the plugin entrypoint (an absolute path ending in the configured entry).
        // Matching by suffix keeps us from prepending the shim to every transformed module,
        // which would both bloat the output and defeat vite's caching.
        if (!id.endsWith(entry.replace(/^\.?\//, '/'))) {
          return;
        }
        const shim = [
          '// composer-plugin: no-op React Refresh shim so cross-origin plugin modules',
          "// don't throw the @vitejs/plugin-react preamble check at dynamic-import time.",
          'if (typeof window !== "undefined") {',
          '  window.$RefreshReg$ = window.$RefreshReg$ || (() => {});',
          '  window.$RefreshSig$ = window.$RefreshSig$ || (() => (type) => type);',
          '  window.__vite_plugin_react_preamble_installed__ = true;',
          '}',
          '',
        ].join('\n');
        return { code: shim + code, map: null };
      },
    },
  ];

  if (meta) {
    // Emit `manifest.json` alongside the built module so the dist output can be uploaded as-is
    // to a GitHub Release for the DXOS community registry to pick up.
    plugins.push({
      name: 'composer-plugin:emit-manifest',
      apply: 'build',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: MANIFEST_ASSET_NAME,
          source: serializeManifest(meta, { moduleFile }),
        });
      },
    });
  }

  return plugins;
};
