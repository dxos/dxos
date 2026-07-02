//
// Copyright 2024 DXOS.org
//

import { onMessage } from 'webext-bridge/background';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { createThumbnail } from './actions';
import { focusOrOpenComposerTab } from './bridge';
import {
  PAGE_ACTION_DELIVER_MESSAGE_TYPE,
  PAGE_ACTION_RUN_MESSAGE_TYPE,
  PAGE_ACTIONS_READY_MESSAGE_TYPE,
  decodeDeliverPayload,
  deliverPickedSnapshot,
  refreshRegistry,
  runPageAction,
} from './page-actions';
import { installSearchProxy } from './proxy';

const NOTIFY_ICON = 'assets/img/icon-128.png';

const notify = (title: string, message: string) => {
  try {
    // `browser.notifications.create()` is async; capture and forward any
    // promise rejection into our logger rather than letting it become an
    // unhandled rejection.
    const notification = browser.notifications?.create?.({
      type: 'basic',
      iconUrl: NOTIFY_ICON,
      title,
      message,
    });
    void notification?.catch?.((err: unknown) => log.catch(err));
  } catch (err) {
    log.catch(err);
  }
};

/**
 * Inject the declared content script into already-open http/https tabs.
 * Declarative content scripts only load on navigations that happen *after*
 * install/update, so without this a freshly installed (or reloaded) extension
 * cannot message any tab that was already open — the panel's `sendMessage`
 * fails with "Receiving end does not exist" until that tab is reloaded.
 */
const injectContentScriptIntoOpenTabs = async (): Promise<void> => {
  const files = (browser.runtime.getManifest().content_scripts ?? []).flatMap((script) => script.js ?? []);
  if (files.length === 0) {
    return;
  }
  const tabs = await browser.tabs.query({ url: ['http://*/*', 'https://*/*'] });
  await Promise.all(
    tabs.map(async (tab) => {
      if (typeof tab.id !== 'number') {
        return;
      }
      try {
        await browser.scripting.executeScript({ target: { tabId: tab.id }, files });
      } catch {
        // Privileged/restricted tabs (Web Store, view-source, PDF viewer) reject
        // injection and can never host the content script — skip them silently.
      }
    }),
  );
};

/**
 * Background worker.
 */
const main = async () => {
  onMessage('config', ({ data }) => {
    return { debug: data.debug ?? false };
  });

  onMessage('open-composer', async () => {
    await focusOrOpenComposerTab();
  });

  // Clicking the toolbar icon opens the side panel (there is no popup).
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => log.catch(err));

  // Render-proxy: lets Composer pages request a JS-rendered URL via a
  // background tab.
  installSearchProxy();

  // Page actions: refresh the registry when a Composer tab announces itself,
  // and run actions on behalf of the panel.
  browser.runtime.onMessage.addListener(
    (msg: any, sender: browser.Runtime.MessageSender): undefined | Promise<unknown> => {
      if (!msg || msg.type !== PAGE_ACTIONS_READY_MESSAGE_TYPE) {
        return undefined;
      }
      // Fire-and-forget: the announcing content script does not await a reply.
      // Returning the refreshRegistry promise (which retries for up to ~15s)
      // would hold the message channel open, so a service-worker suspend or a
      // tab navigation mid-refresh surfaces as "message channel closed" /
      // "receiving end does not exist". Returning undefined closes it at once.
      void refreshRegistry(sender.tab?.id);
      return undefined;
    },
  );
  browser.runtime.onMessage.addListener((msg: any): undefined | Promise<unknown> => {
    if (!msg || msg.type !== PAGE_ACTION_RUN_MESSAGE_TYPE) {
      return undefined;
    }
    if (typeof msg.actionId !== 'string' || typeof msg.tabId !== 'number') {
      return Promise.resolve({ version: 1, id: '', ok: false, error: 'badRequest' });
    }
    // Notify on failure as well as returning the ack: opening a Composer tab
    // steals focus and closes the popup, so the inline status may never render.
    return runPageAction({ actionId: msg.actionId, tabId: msg.tabId }).then((ack) => {
      if (!ack.ok) {
        notify('Action failed', ack.error);
      }
      return ack;
    });
  });
  browser.runtime.onMessage.addListener((msg: any): undefined | Promise<unknown> => {
    if (!msg || msg.type !== PAGE_ACTION_DELIVER_MESSAGE_TYPE) {
      return undefined;
    }
    const payload = decodeDeliverPayload(msg);
    if (!payload) {
      return Promise.resolve({ version: 1, id: '', ok: false, error: 'badRequest' });
    }
    // Notify on failure: the popup has already closed by pick time, so a
    // browser notification is the only feedback channel (mirrors the run flow).
    return deliverPickedSnapshot(payload).then((ack) => {
      if (!ack.ok) {
        notify('Action failed', ack.error);
      }
      return ack;
    });
  });
  // Registry refresh is connection-driven: a Composer content script announces
  // itself via PAGE_ACTIONS_READY (on page load, or via the on-install
  // injection below) and we refresh from that known-connected sender. The
  // background never proactively messages a tab it hasn't heard from — probing
  // a tab whose content script isn't attached yet is what produced spurious
  // "receiving end does not exist" errors on install/update.

  // Create the context menu item and make already-open tabs reachable.
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: 'image-action',
      title: 'Create Thumbnail…',
      contexts: ['image'],
    });
    void injectContentScriptIntoOpenTabs();
  });

  // Handle right-click action.
  browser.contextMenus.onClicked.addListener(async (info: any, tab: any) => {
    switch (info.menuItemId) {
      case 'image-action': {
        // Open the panel first, synchronously within the click gesture: the
        // side panel API rejects `open()` once the user gesture is consumed by
        // an intervening await (the thumbnail upload below). The result arrives
        // in the panel via `storage.onChanged`.
        if (typeof tab?.id === 'number') {
          chrome.sidePanel.open({ tabId: tab.id }).catch((err) => log.catch(err));
        }
        await createThumbnail(info.srcUrl);
        break;
      }
    }
  });
};

void main();
