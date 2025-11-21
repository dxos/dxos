//
// Copyright 2024 DXOS.org
//

import { onMessage } from 'webext-bridge/background';
import browser from 'webextension-polyfill';

import { createThumbnail } from './actions';

/**
 * Background worker.
 */
const main = async () => {
  onMessage('config', ({ data }) => {
    return { debug: data.debug ?? false };
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
