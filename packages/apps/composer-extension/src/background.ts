//
// Copyright 2023 DXOS.org
//

import browser, { type Runtime } from 'webextension-polyfill';

const tabPorts = new Map<number, Runtime.Port>();

browser.runtime.onConnect.addListener((port) => {
  const tabId = port.sender?.tab?.id;
  console.log('Connected to port', { name: port.name, tabId });
  tabId && tabPorts.set(tabId, port);
});

browser.webNavigation.onHistoryStateUpdated.addListener((event) => {
  const port = tabPorts.get(event.tabId);
  port?.postMessage({
    type: 'history-state-updated',
    url: event.url,
  });
});
