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

/**
 * Type guard — validate a ClipAck shape rather than trusting any object with
 * an `ok` property. Unknown responses fall through to `invalidAck`.
 */
const isClipAck = (response: unknown): response is ClipAck => {
  if (!response || typeof response !== 'object') {
    return false;
  }
  const ack = response as { ok?: unknown; id?: unknown; error?: unknown };
  return (ack.ok === true && typeof ack.id === 'string') || (ack.ok === false && typeof ack.error === 'string');
};

/**
 * Find the best matching Composer tab and send the clip. The tab-side
 * bridge listener lives in `content.ts`, which is auto-loaded on every
 * page, so no on-demand script injection is required.
 */
export const deliverClip = async (clip: Clip, options: { timeoutMs?: number } = {}): Promise<DeliverResult> => {
  try {
    const urls = await getComposerUrls();
    const tabs = await browser.tabs.query({ url: urls });
    const tab = pickBestTab(tabs);
    if (!tab || tab.id === undefined) {
      return { status: 'no-tab' };
    }

    const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const ack = await new Promise<ClipAck | 'timeout'>((resolve) => {
      const timer = setTimeout(() => resolve('timeout'), timeout);
      browser.tabs
        .sendMessage(tab.id!, { type: BRIDGE_MSG_TYPE, clip })
        .then((response: unknown) => {
          clearTimeout(timer);
          if (isClipAck(response)) {
            resolve(response);
          } else {
            resolve({ ok: false, error: 'invalidAck' });
          }
        })
        .catch((err: Error) => {
          clearTimeout(timer);
          log.catch(err);
          resolve({ ok: false, error: err.message || 'transportError' });
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
 * Normalize a chrome-style match pattern into an openable URL.
 *
 * Accepts strings like `http://localhost:5173/*` and returns a navigable
 * URL (`http://localhost:5173/`). Returns `undefined` for patterns that
 * can't be safely materialized (wildcard schemes, wildcard hosts, path
 * wildcards other than a trailing `/*`, missing authority, etc.).
 */
const matchPatternToUrl = (pattern: string): string | undefined => {
  try {
    const stripped = pattern.replace(/\/\*$/, '/');
    if (stripped.includes('*')) {
      return undefined;
    }
    // URL constructor enforces a valid scheme + authority.
    const url = new URL(stripped);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
};

/**
 * Open a new Composer tab using the first configured URL that parses into a
 * valid `http(s)` URL. Used by the popup when no Composer tab is open.
 */
export const openComposerTab = async (): Promise<void> => {
  const urls = await getComposerUrls();
  const target = urls.map(matchPatternToUrl).find((u): u is string => !!u);
  if (!target) {
    log.warn('no openable Composer URL configured', { urls });
    return;
  }
  await browser.tabs.create({ url: target });
};
