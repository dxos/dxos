//
// Copyright 2021 DXOS.org
//

import { DevtoolsHost, initDevTool } from '@dxos/devtools';

declare let chrome: any;

export const initPanel = (devtoolsHost: DevtoolsHost) => {
  initDevTool({
    connect (onConnect) {
      onConnect(devtoolsHost);
    },
  
    tabId: chrome.devtools.inspectedWindow.tabId,
  
    onReload (reloadFn) {
      chrome.devtools.network.onNavigated.addListener(reloadFn);
    }
  });
}
