//
// Copyright 2026 DXOS.org
//

import { invoke } from '@tauri-apps/api/core';

import { PluginAssetCache } from '@dxos/app-framework';

/**
 * Tauri-backed implementation of `PluginAssetCache.Cache`.
 *
 * Used on both desktop and mobile (iOS) — the Rust side keeps a single shared
 * implementation under `src-tauri/src/asset_cache.rs`.
 *
 * Differs from the web service-worker impl: dynamic `import()` will not transparently
 * fall back to a cached copy the way the SW intercepts fetches, so `resolve()` returns
 * a `dxos-plugin://...` URL when one exists. The loader imports that URL instead of
 * the original.
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
