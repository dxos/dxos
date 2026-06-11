//
// Copyright 2026 DXOS.org
//

import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { getComposerUrls } from './urls';

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
 * Find the best currently-open Composer tab (highest score), if any.
 */
export const findComposerTab = async (): Promise<browser.Tabs.Tab | undefined> => {
  const urls = await getComposerUrls();
  const tabs = await browser.tabs.query({ url: urls });
  return pickBestTab(tabs);
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
 * Focus an existing Composer tab, or open a new one if none is open.
 */
export const focusOrOpenComposerTab = async (): Promise<void> => {
  const tab = await findComposerTab();
  if (tab?.id !== undefined) {
    await browser.tabs.update(tab.id, { active: true });
    if (tab.windowId !== undefined) {
      await browser.windows.update(tab.windowId, { focused: true });
    }
    lastUsedTabId = tab.id;
    return;
  }
  await openComposerTab();
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
