//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { BaseError } from '@dxos/errors';

/**
 * Tagged error for cache operations. Construction sites supply `context.operation`
 * (one of `'cache' | 'evict' | 'resolve' | 'list'`) and `context.pluginId` so
 * downstream handlers can route on the failed call without scanning the message.
 */
export class PluginAssetCacheError extends BaseError.extend(
  'PluginAssetCacheError',
  'Plugin asset cache operation failed',
) {}

/**
 * Per-platform offline cache for third-party plugin assets.
 *
 * Implementations live alongside their platform glue (composer-app's
 * `asset-cache/{tauri,service-worker}.ts`); the no-op default is for tests
 * and unsupported environments.
 */
export interface Cache {
  /**
   * Persist all listed URLs under the namespace of `pluginId`. Idempotent.
   * The order of `urls` is significant — the first entry is treated as the entry module.
   */
  cache(pluginId: string, urls: readonly string[]): Effect.Effect<void, PluginAssetCacheError>;

  /**
   * Drop all assets for a plugin (uninstall).
   */
  evict(pluginId: string): Effect.Effect<void, PluginAssetCacheError>;

  /**
   * Resolves a plugin asset URL to a platform-specific cached URL when one is available.
   * Returns the original URL when no cached copy exists or the platform serves cached
   * responses transparently (e.g. service worker fetch interception on web).
   */
  resolve(pluginId: string, url: string): Effect.Effect<string, PluginAssetCacheError>;

  /**
   * List currently cached plugin ids (diagnostic).
   */
  list(): Effect.Effect<readonly string[], PluginAssetCacheError>;
}

/**
 * No-op implementation. Used when no platform cache is registered (tests, unsupported environments).
 * Plugins still load — they just have no offline guarantee.
 */
export const noop = (): Cache => ({
  cache: () => Effect.void,
  evict: () => Effect.void,
  resolve: (_pluginId, url) => Effect.succeed(url),
  list: () => Effect.succeed([] as readonly string[]),
});
