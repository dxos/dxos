//
// Copyright 2024 DXOS.org
//

import { onMessage } from 'webext-bridge/background';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { createThumbnail } from './actions';
import { deliverClip, openComposerTab } from './bridge';
import type { Clip } from './clip/types';
import { installDevtoolsRouter } from './devtools/bridge';

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
  installDevtoolsRouter();

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
