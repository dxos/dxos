//
// Copyright 2026 DXOS.org
//

/**
 * Per-platform offline cache for third-party plugin assets.
 *
 * Implementations:
 *  - Web: backed by a service worker cache (see `@dxos/plugin-pwa`).
 *  - Tauri (desktop + iOS): backed by a filesystem cache served via a custom URI scheme (see `@dxos/plugin-native`).
 *  - Tests / unsupported environments: the no-op default returned by `noop()`.
 */
export interface Cache {
  /**
   * Persist all listed URLs under the namespace of `pluginId`. Idempotent.
   * The order of `urls` is significant — the first entry is treated as the entry module.
   */
  cache(pluginId: string, urls: readonly string[]): Promise<void>;

  /**
   * Drop all assets for a plugin (uninstall).
   */
  evict(pluginId: string): Promise<void>;

  /**
   * Resolves a plugin asset URL to a platform-specific cached URL when one is available.
   * Returns the original URL when no cached copy exists or the platform serves cached
   * responses transparently (e.g. service worker fetch interception on web).
   */
  resolve(pluginId: string, url: string): Promise<string>;

  /**
   * List currently cached plugin ids (diagnostic).
   */
  list(): Promise<readonly string[]>;
}

/**
 * No-op implementation. Used when no platform cache is registered (tests, unsupported environments).
 * Plugins still load — they just have no offline guarantee.
 */
export const noop = (): Cache => ({
  cache: async () => {},
  evict: async () => {},
  resolve: async (_pluginId, url) => url,
  list: async () => [],
});
