//
// Copyright 2026 DXOS.org
//

import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

const INJECT_READY_MAX_ATTEMPTS = 20;
const INJECT_READY_INTERVAL_MS = 50;

/**
 * Inject the content script into a tab and wait for it to finish initializing.
 *
 * CRXJS wraps the actual content module in an async dynamic import inside a
 * synchronous IIFE loader. Chrome resolves executeScript once the synchronous
 * wrapper exits — before the module has evaluated and registered its message
 * listeners. We poll window.__composerContentScriptLoaded so callers can trust
 * that listeners are in place before sending the first message.
 */
export const injectContentScript = async (tabId: number): Promise<void> => {
  const files = browser.runtime.getManifest().content_scripts?.[0]?.js;
  if (!files?.length) {
    return;
  }
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Restricted pages (chrome://, file://, settings) and closed tabs produce
    // well-known "Cannot access" / "No tab with id" errors — expected, not actionable.
    if (!/Cannot access|No tab with id/i.test(message)) {
      log.catch(err);
    }
    return;
  }
  for (let attempt = 0; attempt < INJECT_READY_MAX_ATTEMPTS; attempt++) {
    try {
      const frames = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => window.__composerContentScriptLoaded === true,
      });
      if (frames[0]?.result === true) {
        return;
      }
    } catch {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, INJECT_READY_INTERVAL_MS));
  }
};
