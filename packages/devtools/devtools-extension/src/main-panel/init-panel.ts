//
// Copyright 2021 DXOS.org
//

import { Client } from '@dxos/client';
import { initialize } from '@dxos/devtools';

declare let chrome: any;

export const initPanel = (client: Client) => {
  initialize({
    connect (onConnect) {
      onConnect(client);
    },

    tabId: chrome.devtools.inspectedWindow.tabId,

    onReload (reloadFn) {
      chrome.devtools.network.onNavigated.addListener(reloadFn);
    }
  });
};
