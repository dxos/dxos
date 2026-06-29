//
// Copyright 2026 DXOS.org
//

import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { findComposerTab } from '../bridge/sender';
import { matchesUrlPatterns } from './match-pattern';
import {
  PAGE_ACTIONS_LIST_MESSAGE_TYPE,
  PAGE_ACTIONS_STORAGE_KEY,
  type PageActionContext,
  type PageActionDescriptor,
  type PageActionsRegistry,
  decodeListAck,
  decodeRegistry,
} from './types';
import { nextId, sleep } from './util';

const REFRESH_RETRY_INTERVAL_MS = 5_000;
const REFRESH_RETRY_ATTEMPTS = 3;

/**
 * Minimal injectable surface of the browser operations `refreshRegistry`
 * depends on. Structurally satisfied by the live `browser` polyfill, and
 * trivially mockable in tests (mirrors `InvokeBridgeApi` in `invoke.ts`).
 */
export interface RegistryBridgeApi {
  findComposerTab(): Promise<{ id?: number } | undefined>;
  sendMessage(tabId: number, message: unknown): Promise<unknown>;
  storageSet(key: string, value: unknown): Promise<void>;
}

const defaultRegistryApi: RegistryBridgeApi = {
  findComposerTab,
  sendMessage: (tabId, message) => browser.tabs.sendMessage(tabId, message),
  storageSet: (key, value) => browser.storage.local.set({ [key]: value }),
};

export type RefreshRegistryOptions = {
  retryIntervalMs?: number;
  retryAttempts?: number;
};

/**
 * Refresh the descriptor cache from a Composer tab. No-op (keeps the stale
 * cache) when no tab is available or the request fails — the popup must keep
 * working from the last known registry. On a `timeout` ack the request is
 * retried (up to `retryAttempts` total) to handle the race where the
 * background receives the ready signal before Composer's listeners have
 * actually attached. Other error codes are not retried.
 */
export const refreshRegistry = async (
  tabId?: number,
  api: RegistryBridgeApi = defaultRegistryApi,
  options: RefreshRegistryOptions = {},
): Promise<void> => {
  const { retryIntervalMs = REFRESH_RETRY_INTERVAL_MS, retryAttempts = REFRESH_RETRY_ATTEMPTS } = options;
  const target = tabId ?? (await api.findComposerTab())?.id;
  if (target === undefined) {
    return;
  }
  for (let attempt = 0; attempt < retryAttempts; attempt++) {
    try {
      const response = await api.sendMessage(target, {
        type: PAGE_ACTIONS_LIST_MESSAGE_TYPE,
        request: { version: 1, id: nextId() },
      });
      const ack = decodeListAck(response);
      if (!ack) {
        log.info('page-actions registry refresh failed', { error: 'invalidAck' });
        return;
      }
      if (!ack.ok) {
        if (ack.error === 'timeout' && attempt < retryAttempts - 1) {
          log.info('page-actions registry refresh timed out, retrying', { attempt });
          await sleep(retryIntervalMs);
          continue;
        }
        log.info('page-actions registry refresh failed', { error: ack.error });
        return;
      }
      const registry: PageActionsRegistry = { fetchedAt: new Date().toISOString(), actions: ack.actions };
      await api.storageSet(PAGE_ACTIONS_STORAGE_KEY, registry);
      log.info('page-actions registry refreshed', { count: ack.actions.length });
      return;
    } catch (err) {
      log.catch(err);
      return;
    }
  }
};

/**
 * Read the cached registry (empty when never fetched). The stored value is
 * re-validated on every read — storage content survives extension upgrades
 * and is treated as untrusted input.
 */
export const getRegistry = async (): Promise<PageActionsRegistry> => {
  const stored = await browser.storage.local.get(PAGE_ACTIONS_STORAGE_KEY);
  return decodeRegistry(stored?.[PAGE_ACTIONS_STORAGE_KEY]) ?? { fetchedAt: '', actions: [] };
};

/**
 * Cached actions applicable to a URL in a given context.
 */
export const getActionsForUrl = async (url: string, context: PageActionContext): Promise<PageActionDescriptor[]> => {
  const { actions } = await getRegistry();
  return actions.filter((action) => action.contexts.includes(context) && matchesUrlPatterns(url, action.urlPatterns));
};
