//
// Copyright 2026 DXOS.org
//

import { PluginAssetCache } from '@dxos/app-framework';
import { log } from '@dxos/log';

/**
 * Message envelope shape recognised by the custom service worker (see composer-app/src/sw.ts).
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

/**
 * Service-worker-backed implementation of `PluginAssetCache.Cache`.
 *
 * The actual fetching and storage happens inside the service worker (see
 * composer-app/src/sw.ts). On the host side this just exchanges messages over
 * a `MessageChannel` and lets the SW's fetch handler serve cached responses
 * transparently — so `resolve()` returns the original URL unchanged.
 */
export const createServiceWorkerAssetCache = (): PluginAssetCache.Cache => ({
  cache: async (pluginId, urls) => {
    try {
      await sendMessage({ type: 'dxos:cache-plugin-assets', pluginId, urls });
    } catch (error) {
      log.warn('failed to cache plugin assets in service worker', { pluginId, error });
      throw error;
    }
  },
  evict: async (pluginId) => {
    await sendMessage({ type: 'dxos:evict-plugin', pluginId });
  },
  resolve: async (_pluginId, url) => url,
  list: async () => {
    const result = (await sendMessage({ type: 'dxos:list-plugins' })) as readonly string[];
    return result;
  },
});
