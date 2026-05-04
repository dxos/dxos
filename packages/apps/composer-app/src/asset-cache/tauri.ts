//
// Copyright 2026 DXOS.org
//

import { invoke } from '@tauri-apps/api/core';

import { type PluginAssetCache } from '@dxos/app-framework';

/**
 * Tauri-backed `PluginAssetCache.Cache` for desktop + iOS. Drives the Rust
 * filesystem cache under `app_data_dir/plugin-cache/` and serves bytes via
 * the `dxos-plugin://` URI scheme registered on the Tauri builder.
 *
 * Differs from the web service-worker impl: dynamic `import()` will not
 * transparently fall back to a cached copy the way the SW intercepts fetches,
 * so `resolve()` returns a `dxos-plugin://...` URL when one exists. The host
 * loader imports that URL instead of the original.
 */
export const createTauriAssetCache = (): PluginAssetCache.Cache => ({
  cache: async (pluginId, urls) => {
    await invoke('cache_plugin_assets', { pluginId, urls });
  },
  evict: async (pluginId) => {
    await invoke('evict_plugin', { pluginId });
  },
  resolve: async (pluginId, url) => {
    const cached = await invoke<string | null>('resolve_cached_url', { pluginId, url });
    return cached ?? url;
  },
  list: async () => {
    const result = await invoke<string[]>('list_cached_plugins');
    return result;
  },
});
