//
// Copyright 2021 DXOS.org
//

import { DevtoolsHost, initDevTool } from '@dxos/devtools';

declare let chrome: any;

export const initPanel = (devtoolsFactory: () => DevtoolsHost | Promise<DevtoolsHost>) => {
  initDevTool({
    connect (onConnect) {
      (async () => {
        const devtoolsHost = await devtoolsFactory();
        onConnect(devtoolsHost);
      })();
    },
  
    tabId: chrome.devtools.inspectedWindow.tabId,
  
    onReload (reloadFn) {
      chrome.devtools.network.onNavigated.addListener(reloadFn);
    }
  });
}
