//
// Copyright 2026 DXOS.org
//

// Split out of `vite-plugin` so the compiled `dx` binary can load a plugin's `dx.config.ts` without bundling Vite,
// esbuild or the composer plugin.

export { findDxConfigFile, loadDxConfig } from './load.ts';

/** The package EDGE starts a plugin with; `vendor/` carries it when the build can resolve it. */
export const PLUGIN_HOST_SPECIFIER = '@dxos/plugin-host-cloudflare';

/**
 * Names the EDGE plugin host's entry file for a build that cannot resolve the host from the plugin itself (the dxos
 * monorepo's own release check), so `vendor/` carries it.
 */
export const PLUGIN_HOST_ENTRY_ENV = 'DX_PLUGIN_HOST_ENTRY';
