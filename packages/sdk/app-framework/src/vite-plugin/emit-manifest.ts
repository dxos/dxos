//
// Copyright 2026 DXOS.org
//

import { type Plugin as VitePlugin } from 'vite';

import type * as Plugin from '../core/plugin';

/**
 * Name of the asset written by {@link emitManifestPlugin}.
 * The DXOS community registry resolves each published plugin by fetching this file
 * from the repo's latest GitHub Release, so authors should not rename it.
 */
export const MANIFEST_ASSET_NAME = 'manifest.json';

/**
 * Serializes a plugin's public metadata into the format consumed by the community registry.
 * `moduleFile` is the name of the built module asset (e.g. `plugin.mjs`) that will be
 * uploaded to the same GitHub Release as the manifest.
 */
export const emitManifest = (meta: Plugin.Meta, { moduleFile }: { moduleFile: string }): string =>
  JSON.stringify({ ...meta, moduleFile }, null, 2);

export type EmitManifestPluginOptions = {
  /** Plugin metadata — typically re-exported from the plugin's own source. */
  meta: Plugin.Meta;
  /** Filename of the built module asset that the registry will load. Defaults to `plugin.mjs`. */
  moduleFile?: string;
};

/**
 * Vite plugin that emits `manifest.json` alongside the built plugin module.
 *
 * Intended for use in an external community plugin's Vite config: the resulting
 * `dist/manifest.json` and `dist/plugin.mjs` can both be uploaded as assets to a
 * GitHub Release, where the DXOS community registry will pick them up.
 */
export const emitManifestPlugin = ({ meta, moduleFile = 'plugin.mjs' }: EmitManifestPluginOptions): VitePlugin => ({
  name: 'composer-plugin:emit-manifest',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: MANIFEST_ASSET_NAME,
      source: emitManifest(meta, { moduleFile }),
    });
  },
});
