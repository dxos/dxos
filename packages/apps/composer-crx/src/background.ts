//
// Copyright 2024 DXOS.org
//

import { onMessage } from 'webext-bridge/background';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { createThumbnail } from './actions';
import { deliverClip, openComposerTab } from './bridge';

const NOTIFY_ICON = 'assets/img/icon-128.png';

const notify = (title: string, message: string) => {
  try {
    void browser.notifications?.create?.({
      type: 'basic',
      iconUrl: NOTIFY_ICON,
      title,
      message,
    });
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

  // Deliver a clip produced by the content-script picker to an open Composer
  // tab. Content script hands us the finished Clip; we handle discovery and
  // surface notifications when there's no Composer tab / delivery fails.
  onMessage('clip', async ({ data }) => {
    log.info('delivering clip', { kind: data.clip.kind });
    const result = await deliverClip(data.clip);
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
