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
 * plugin works offline. The entry module is always {@link ENTRY_FILENAME}; it
 * must appear in `assets`.
 *
 * Exported from a vite-free module so tests and tooling can validate manifests
 * without paying the cost of loading vite + esbuild.
 */
export const serializeManifest = (meta: BuildMeta, { assets }: { assets: readonly string[] }): string =>
  JSON.stringify(
    {
      ...meta,
      assets,
    },
    null,
    2,
  );
