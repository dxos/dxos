//
// Copyright 2026 DXOS.org
//

import { type Plugin } from 'vite';

import { DEFAULT_PACKAGES } from './packages';

const JSX_DEV_RUNTIME = 'react/jsx-dev-runtime';

/** Regex patterns matching each shared package and all its subpath imports. */
const EXTERNAL_DEPS = DEFAULT_PACKAGES.map((pkg) => new RegExp(`^${pkg.replace('/', '\\/')}(\\/|$)`));

/** Checks whether an import should be externalized (all shared deps except jsx-dev-runtime). */
const isExternal = (id: string) => id !== JSX_DEV_RUNTIME && EXTERNAL_DEPS.some((pattern) => pattern.test(id));

/**
 * Vite plugin for **external Composer plugin projects**. Configures the build to produce
 * an ESM bundle that externalizes all framework dependencies, which the Composer host app
 * provides at runtime via import map.
 *
 * Handles three concerns:
 * 1. Build config — lib mode entry point, ES format output, rollup externals.
 * 2. Dev externalization — marks shared deps as external during `vite serve` and strips
 *    the `/@id/` prefix that Vite's import analysis adds to external bare specifiers.
 * 3. JSX dev runtime shim — bridges `react/jsx-dev-runtime` (used by React refresh in dev)
 *    to `react/jsx-runtime` (which is what the externalized React provides).
 */
export const composerPlugin = (options?: { entry?: string; port?: number }): Plugin[] => {
  const entry = options?.entry ?? 'src/plugin.tsx';
  const port = options?.port ?? 3967;
  const resolved = new Set<string>();
  let base = '/';

  return [
    // Plugin 1: Configure vite for library-mode builds with externalized deps.
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
          lib: {
            entry,
            formats: ['es'],
          },
          rolldownOptions: {
            external: EXTERNAL_DEPS,
          },
        },
      }),
    },

    // Plugin 2: Dev-time externalization.
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
        (config.plugins as Plugin[]).push({
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

    // Plugin 3: JSX dev runtime shim.
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
  ];
};
