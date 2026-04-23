//
// Copyright 2026 DXOS.org
//

import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { type Clip, type ClipAck } from '../clip/types';
import { getComposerUrls } from './urls';

/**
 * Result of a delivery attempt.
 *   - `delivered`  : Composer acked the clip; `ack` is present.
 *   - `no-tab`     : No matching Composer tab was open.
 *   - `timeout`    : A tab was found but did not ack within the timeout.
 *   - `error`      : Unexpected transport error (permissions, closed tab, …).
 */
export type DeliverResult =
  | { status: 'delivered'; ack: ClipAck; tabId: number }
  | { status: 'no-tab' }
  | { status: 'timeout'; tabId: number }
  | { status: 'error'; error: string };

const BRIDGE_MSG_TYPE = 'composer-crx:clip';
const DEFAULT_TIMEOUT_MS = 5_000;

let lastUsedTabId: number | undefined;

const scoreTab = (tab: browser.Tabs.Tab): number => {
  let score = 0;
  if (tab.id !== undefined && tab.id === lastUsedTabId) {
    score += 100;
  }
  if (tab.active) {
    score += 10;
  }
  if (tab.lastAccessed) {
    score += Math.min(5, Math.max(0, 5 - (Date.now() - tab.lastAccessed) / (1000 * 60)));
  }
  return score;
};

const pickBestTab = (tabs: browser.Tabs.Tab[]): browser.Tabs.Tab | undefined => {
  if (tabs.length === 0) {
    return undefined;
  }
  const withId = tabs.filter((t) => typeof t.id === 'number');
  return withId.sort((a, b) => scoreTab(b) - scoreTab(a))[0];
};

const injectBridge = async (tabId: number): Promise<void> => {
  // Idempotent — the bridge content script sets a guard on `window` and
  // no-ops on re-injection.
  await browser.scripting.executeScript({
    target: { tabId },
    files: ['src/bridge/receiver.ts'],
    injectImmediately: true,
  } as any);
};

/**
 * Find the best matching Composer tab, inject the bridge receiver, and send
 * the clip. Awaits the `composer:clip:ack` response from the page.
 */
export const deliverClip = async (clip: Clip, options: { timeoutMs?: number } = {}): Promise<DeliverResult> => {
  try {
    const urls = await getComposerUrls();
    const tabs = await browser.tabs.query({ url: urls });
    const tab = pickBestTab(tabs);
    if (!tab || tab.id === undefined) {
      return { status: 'no-tab' };
    }

    await injectBridge(tab.id);

    const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const ack = await new Promise<ClipAck | 'timeout'>((resolve) => {
      const timer = setTimeout(() => resolve('timeout'), timeout);
      browser.tabs
        .sendMessage(tab.id!, { type: BRIDGE_MSG_TYPE, clip })
        .then((response: any) => {
          clearTimeout(timer);
          if (response && typeof response === 'object' && 'ok' in response) {
            resolve(response as ClipAck);
          } else {
            resolve({ ok: false, error: 'invalid-ack' });
          }
        })
        .catch((err: Error) => {
          clearTimeout(timer);
          log.catch(err);
          resolve({ ok: false, error: err.message || 'transport-error' });
        });
    });

    if (ack === 'timeout') {
      return { status: 'timeout', tabId: tab.id };
    }
    lastUsedTabId = tab.id;
    return { status: 'delivered', ack, tabId: tab.id };
  } catch (err: any) {
    log.catch(err);
    return { status: 'error', error: err?.message ?? 'unknown' };
  }
};

/**
 * Open a new Composer tab using the first configured URL pattern. Used by
 * the popup when no Composer tab is open.
 */
export const openComposerTab = async (): Promise<void> => {
  const urls = await getComposerUrls();
  const first = urls[0]?.replace(/\*$/, '') ?? 'https://composer.dxos.org/';
  await browser.tabs.create({ url: first });
};
