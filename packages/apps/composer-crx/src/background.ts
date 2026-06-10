//
// Copyright 2024 DXOS.org
//

import { onMessage } from 'webext-bridge/background';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { createThumbnail } from './actions';
import { deliverClip, openComposerTab } from './bridge';
import type { Clip } from './clip';
import {
  PAGE_ACTIONS_READY_MESSAGE_TYPE,
  PAGE_ACTION_RUN_MESSAGE_TYPE,
  refreshRegistry,
  runPageAction,
} from './page-actions';
import { installSearchProxy } from './proxy';

const NOTIFY_ICON = 'assets/img/icon-128.png';

const BACKGROUND_CLIP_MSG_TYPE = 'composer-crx:deliver-clip';

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
 * Route a clip through the bridge to an open Composer tab. Surfaces a
 * browser notification on non-success outcomes so the user gets feedback
 * even though the popup has already closed.
 */
const handleIncomingClip = async (clip: Clip) => {
  log.info('delivering clip', { kind: clip.kind, url: clip.source.url });
  const result = await deliverClip(clip);
  switch (result.status) {
    case 'delivered':
      if (!result.ack.ok) {
        notify('Clip rejected', result.ack.error);
      }
      break;
    case 'no-tab':
      notify('No Composer tab', 'Open Composer from the extension popup to receive clips.');
      break;
    case 'timeout':
      notify('Clip timed out', 'Composer did not acknowledge the clip.');
      break;
    case 'error':
      notify('Clip failed', result.error);
      break;
  }
  return result;
};

/**
 * Background worker.
 */
const main = async () => {
  onMessage('config', ({ data }) => {
    return { debug: data.debug ?? false };
  });

  // Content script delivers finished clips to us via direct
  // `browser.runtime.sendMessage` (not webext-bridge) so routing doesn't
  // depend on the popup still being alive.
  browser.runtime.onMessage.addListener((msg: any): undefined | Promise<unknown> => {
    if (!msg || msg.type !== BACKGROUND_CLIP_MSG_TYPE) {
      return undefined;
    }
    const clip = msg.clip as Clip;
    return handleIncomingClip(clip);
  });

  onMessage('open-composer', async () => {
    await openComposerTab();
  });

  // Render-proxy: lets Composer pages request a JS-rendered URL via a
  // background tab. Additive to the clip flow above.
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
  browser.runtime.onMessage.addListener((msg: any): undefined | Promise<unknown> => {
    if (!msg || msg.type !== PAGE_ACTION_RUN_MESSAGE_TYPE) {
      return undefined;
    }
    if (typeof msg.actionId !== 'string' || typeof msg.tabId !== 'number') {
      return Promise.resolve({ version: 1, id: '', ok: false, error: 'badRequest' });
    }
    // Notify on failure as well as returning the ack: opening a Composer tab
    // steals focus and closes the popup, so the inline status may never render
    // (mirrors the clip flow's notification fallback).
    return runPageAction({ actionId: msg.actionId, tabId: msg.tabId }).then((ack) => {
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
