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
 * Extends `Plugin.Meta` with a build-time `version` field that is not
 * relevant to the runtime plugin definition itself.
 */
export type BuildMeta = Plugin.Meta & { version: string };

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
  // The published manifest is keyed by the bare NSID `id`; the `key` DXN is an
  // in-process convenience and is intentionally omitted to keep the registry
  // wire-format stable. `version` is the build-time package version (may be a
  // non-semver dev tag), carried by `BuildMeta` rather than derived from `key`.
  const { key: _key, ...rest } = meta;
  return JSON.stringify(
    {
      ...rest,
      assets,
      ...(devEntry !== undefined ? { devEntry } : {}),
    },
    null,
    2,
  );
};
