//
// Copyright 2026 DXOS.org
//

import { type Plugin as VitePlugin } from 'vite';

import { type Plugin } from '../core';

import { DEFAULT_PACKAGES, isSharedPackage } from './packages';

const JSX_DEV_RUNTIME = 'react/jsx-dev-runtime';

/**
 * Name of the asset written alongside the built module bundle.
 * The DXOS community registry resolves each published plugin by fetching this file
 * from the repo's latest GitHub Release, so authors should not rename it.
 */
export const MANIFEST_ASSET_NAME = 'manifest.json';

const DEFAULT_MODULE_FILE = 'plugin.mjs';

/**
 * Whether an import should be externalized by the plugin bundle.
 * Uses the shared-package predicate directly so plugins automatically pick up any
 * new `@dxos/*` (non-plugin) package the host provides, without a code change here.
 */
const isExternal = (id: string) => id !== JSX_DEV_RUNTIME && isSharedPackage(id);

/**
 * Serializes a plugin's public metadata into the format consumed by the community registry.
 * Exported so tests and tooling can validate manifests without depending on vite.
 */
export const serializeManifest = (meta: Plugin.Meta, { moduleFile }: { moduleFile: string }): string =>
  JSON.stringify({ ...meta, moduleFile }, null, 2);

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
          lib: {
            entry,
            formats: ['es'],
          },
          rolldownOptions: {
            external: (id: string) => isExternal(id),
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
