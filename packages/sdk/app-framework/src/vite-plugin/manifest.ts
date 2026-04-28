//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '../core';

/**
 * Name of the asset written alongside the built module bundle.
 * The DXOS community registry resolves each published plugin by fetching this file
 * from the repo's latest GitHub Release, so authors should not rename it.
 */
export const MANIFEST_ASSET_NAME = 'manifest.json';

/**
 * Serializes a plugin's public metadata into the format consumed by the community registry.
 * Exported from a vite-free module so tests and tooling can validate manifests without
 * paying the cost of loading vite + esbuild.
 */
export const serializeManifest = (meta: Plugin.Meta, { moduleFile }: { moduleFile: string }): string =>
  JSON.stringify({ ...meta, moduleFile }, null, 2);
