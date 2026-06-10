//
// Copyright 2026 DXOS.org
//

import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { findComposerTab } from '../bridge/sender';
import { matchesUrlPatterns } from './match-pattern';
import {
  type PageActionContext,
  type PageActionDescriptor,
  type PageActionsRegistry,
  PAGE_ACTIONS_LIST_MESSAGE_TYPE,
  PAGE_ACTIONS_STORAGE_KEY,
  decodeListAck,
  decodeRegistry,
} from './types';

let counter = 0;
const nextId = (): string => globalThis.crypto?.randomUUID?.() ?? `pa-${(counter += 1)}`;

/**
 * Refresh the descriptor cache from a Composer tab. No-op (keeps the stale
 * cache) when no tab is available or the request fails — the popup must keep
 * working from the last known registry.
 */
export const refreshRegistry = async (tabId?: number): Promise<void> => {
  const target = tabId ?? (await findComposerTab())?.id;
  if (target === undefined) {
    return;
  }
  try {
    const response = await browser.tabs.sendMessage(target, {
      type: PAGE_ACTIONS_LIST_MESSAGE_TYPE,
      request: { version: 1, id: nextId() },
    });
    const ack = decodeListAck(response);
    if (!ack) {
      log.info('page-actions registry refresh failed', { error: 'invalidAck' });
      return;
    }
    if (!ack.ok) {
      log.info('page-actions registry refresh failed', { error: ack.error });
      return;
    }
    const registry: PageActionsRegistry = { fetchedAt: new Date().toISOString(), actions: ack.actions };
    await browser.storage.local.set({ [PAGE_ACTIONS_STORAGE_KEY]: registry });
    log.info('page-actions registry refreshed', { count: ack.actions.length });
  } catch (err) {
    log.catch(err);
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
