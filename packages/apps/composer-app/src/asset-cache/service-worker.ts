//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { PluginAssetCache } from '@dxos/app-framework';
import { log } from '@dxos/log';

/**
 * Message envelope shape recognised by the custom service worker (see ../sw.ts).
 * Kept here so the SW source and the host-side helper agree on the schema.
 */
export type AssetCacheMessage =
  | { type: 'dxos:cache-plugin-assets'; pluginId: string; urls: readonly string[] }
  | { type: 'dxos:evict-plugin'; pluginId: string }
  | { type: 'dxos:list-plugins' };

const REQUEST_TIMEOUT_MS = 30_000;

const sendMessage = async (message: AssetCacheMessage): Promise<unknown> => {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
    throw new Error('Service worker unavailable');
  }
  const registration = await navigator.serviceWorker.ready;
  const target = navigator.serviceWorker.controller ?? registration.active;
  if (!target) {
    throw new Error('No active service worker');
  }
  return new Promise<unknown>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => {
      channel.port1.close();
      reject(new Error(`Service worker did not respond to ${message.type} within ${REQUEST_TIMEOUT_MS}ms`));
    }, REQUEST_TIMEOUT_MS);
    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      channel.port1.close();
      const data = event.data as { ok: boolean; result?: unknown; error?: string };
      if (data.ok) {
        resolve(data.result);
      } else {
        reject(new Error(data.error ?? 'Service worker request failed'));
      }
    };
    target.postMessage(message, [channel.port2]);
  });
};

const sendMessageEffect = <T>(
  operation: 'cache' | 'evict' | 'resolve' | 'list',
  message: AssetCacheMessage,
  pluginId?: string,
): Effect.Effect<T, PluginAssetCache.PluginAssetCacheError> =>
  Effect.tryPromise({
    try: () => sendMessage(message) as Promise<T>,
    catch: (cause) => new PluginAssetCache.PluginAssetCacheError({ context: { operation, pluginId }, cause }),
  });

/**
 * Service-worker-backed `PluginAssetCache.Cache`. The actual fetching and storage
 * happens inside the SW (see ../sw.ts). On the host side this just exchanges
 * messages over a `MessageChannel` and lets the SW's fetch handler serve cached
 * responses transparently — so `resolve()` returns the original URL unchanged.
 */
export const createServiceWorkerAssetCache = (): PluginAssetCache.Cache => ({
  cache: (pluginId, urls) =>
    sendMessageEffect<void>('cache', { type: 'dxos:cache-plugin-assets', pluginId, urls }, pluginId).pipe(
      Effect.tapError((error) => Effect.sync(() => log.warn('failed to cache plugin assets', { pluginId, error }))),
    ),
  evict: (pluginId) => sendMessageEffect<void>('evict', { type: 'dxos:evict-plugin', pluginId }, pluginId),
  resolve: (_pluginId, url) => Effect.succeed(url),
  list: () => sendMessageEffect<readonly string[]>('list', { type: 'dxos:list-plugins' }),
});
