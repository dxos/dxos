//
// Copyright 2026 DXOS.org
//

import { PLUGIN_ENTRY_FILENAME } from '@dxos/protocols';

import { type Plugin } from '../core';

/**
 * Name of the asset written alongside the built module bundle.
 * The DXOS community registry resolves each published plugin by fetching this file
 * from the repo's latest GitHub Release, so authors should not rename it.
 */
export const MANIFEST_ASSET_NAME = 'manifest.json';

/**
 * Canonical entry filename (re-exported from `@dxos/protocols`) so vite-plugin
 * consumers don't have to reach into the protocols package directly.
 */
export const ENTRY_FILENAME = PLUGIN_ENTRY_FILENAME;

/**
 * Plugin metadata required to emit a manifest at build time.
 *
 * Extends `Plugin.Meta` with build-time fields not relevant to the runtime plugin
 * definition: the package `version`, and a `dependencies` snapshot (every declared
 * dependency resolved to its concrete installed version). The host derives SDK
 * compatibility from the subset of `dependencies` it shares with the plugin (the
 * externalized `@dxos/*` packages); the rest are recorded for transparency.
 */
export type BuildMeta = Plugin.Meta & { version: string; dependencies?: Record<string, string> };

/**
 * Augments a runtime {@link Plugin.Meta} with the build-time fields needed to emit a manifest: the
 * package `version` (from the publishing project's `package.json`) and an optional resolved
 * `dependencies` snapshot. Produces the {@link BuildMeta} that `composerPlugin` serializes.
 */
export const toBuildMeta = (meta: Plugin.Meta, version: string, dependencies?: Record<string, string>): BuildMeta => ({
  ...meta,
  version,
  ...(dependencies ? { dependencies } : {}),
});

/**
 * Serializes a plugin's public metadata + bundle layout into the format consumed
 * by the host loader (see `UrlLoader.make` and `PluginManifest.parse`).
 *
 * The host fetches this manifest, resolves every entry in `assets` against the
 * manifest URL, and persists them via the platform `PluginAssetCache` so the
 * plugin works offline. For production builds the entry module is always
 * {@link ENTRY_FILENAME} and must appear in `assets`. For dev-server manifests
 * pass `devEntry` (a path relative to the manifest URL) — the host then imports
 * the entry directly from the dev server and skips offline caching, since the
 * full asset graph isn't enumerable until build time.
 *
 * Exported from a vite-free module so tests and tooling can validate manifests
 * without paying the cost of loading vite + esbuild.
 */
export const serializeManifest = (
  meta: BuildMeta,
  { assets, devEntry }: { assets: readonly string[]; devEntry?: string },
): string => {
  return JSON.stringify(
    {
      ...meta,
      assets,
      ...(devEntry !== undefined ? { devEntry } : {}),
    },
    null,
    2,
  );
};
