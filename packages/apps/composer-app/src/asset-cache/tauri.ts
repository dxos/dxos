//
// Copyright 2026 DXOS.org
//

import { invoke } from '@tauri-apps/api/core';
import * as Effect from 'effect/Effect';

import { PluginAssetCache } from '@dxos/app-framework';

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
export const createTauriAssetCache = (): PluginAssetCache.Cache => {
  const tryInvoke = <T>(
    operation: 'cache' | 'evict' | 'resolve' | 'list',
    cmd: string,
    args?: { pluginId?: string; [key: string]: unknown },
  ): Effect.Effect<T, PluginAssetCache.PluginAssetCacheError> =>
    Effect.tryPromise({
      try: () => invoke<T>(cmd, args),
      catch: (cause) =>
        new PluginAssetCache.PluginAssetCacheError({
          context: { operation, pluginId: args?.pluginId },
          cause,
        }),
    });

  return {
    cache: (pluginId, urls) => tryInvoke<void>('cache', 'cache_plugin_assets', { pluginId, urls }),
    evict: (pluginId) => tryInvoke<void>('evict', 'evict_plugin', { pluginId }),
    resolve: (pluginId, url) =>
      Effect.map(
        tryInvoke<string | null>('resolve', 'resolve_cached_url', { pluginId, url }),
        (cached) => cached ?? url,
      ),
    list: () => tryInvoke<readonly string[]>('list', 'list_cached_plugins'),
  };
};
