//
// Copyright 2024 DXOS.org
//

import { onMessage, sendMessage } from 'webext-bridge/background';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { createThumbnail } from './actions';
import { focusOrOpenComposerTab } from './bridge';
import { injectContentScript } from './inject';
import {
  PAGE_ACTIONS_READY_MESSAGE_TYPE,
  PAGE_ACTION_DELIVER_MESSAGE_TYPE,
  PAGE_ACTION_RUN_MESSAGE_TYPE,
  START_PICKER_REQUEST_MESSAGE_TYPE,
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
 * Background worker.
 */
const main = async () => {
  onMessage('config', ({ data }) => {
    return { debug: data.debug ?? false };
  });

  onMessage('open-composer', async () => {
    await focusOrOpenComposerTab();
  });

  // Render-proxy: lets Composer pages request a JS-rendered URL via a
  // background tab.
  installSearchProxy();

  // Page actions: refresh the registry when a Composer tab announces itself,
  // and run actions on behalf of the popup.
  browser.runtime.onMessage.addListener(
    (msg: any, sender: browser.Runtime.MessageSender): undefined | Promise<unknown> => {
      if (!msg || msg.type !== PAGE_ACTIONS_READY_MESSAGE_TYPE) {
        return undefined;
      }
      return refreshRegistry(sender.tab?.id);
    },
  );
  // Popup routes start-picker through the background so the content script can
  // be injected on-demand before the webext-bridge message is forwarded.
  browser.runtime.onMessage.addListener((msg: any): undefined | Promise<unknown> => {
    if (!msg || msg.type !== START_PICKER_REQUEST_MESSAGE_TYPE) {
      return undefined;
    }
    if (typeof msg.tabId !== 'number') {
      return undefined;
    }
    return injectContentScript(msg.tabId).then(() =>
      sendMessage('start-picker', {}, { context: 'content-script', tabId: msg.tabId }),
    );
  });

  browser.runtime.onMessage.addListener((msg: any): undefined | Promise<unknown> => {
    if (!msg || msg.type !== PAGE_ACTION_RUN_MESSAGE_TYPE) {
      return undefined;
    }
    if (typeof msg.actionId !== 'string' || typeof msg.tabId !== 'number') {
      return Promise.resolve({ version: 1, id: '', ok: false, error: 'badRequest' });
    }
    // Inject content script on-demand before extracting (page may not be a Composer page).
    // Notify on failure as well as returning the ack: opening a Composer tab
    // steals focus and closes the popup, so the inline status may never render.
    return injectContentScript(msg.tabId)
      .then(() => runPageAction({ actionId: msg.actionId, tabId: msg.tabId }))
      .then((ack) => {
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
  browser.runtime.onStartup?.addListener?.(() => void refreshRegistry());
  void refreshRegistry();

  // Create the context menu item.
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: 'image-action',
      title: 'Create Thumbnail…',
      contexts: ['image'],
    });
  });

  // Handle right-click action.
  browser.contextMenus.onClicked.addListener(async (info: any, _tab: any) => {
    switch (info.menuItemId) {
      case 'image-action': {
        await createThumbnail(info.srcUrl);
        break;
      }
    }
  });
};

void main();
