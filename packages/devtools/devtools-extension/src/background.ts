//
// Copyright 2020 DXOS.org
//

import browser, { Runtime } from 'webextension-polyfill';

const panelPorts = new Map<number, Runtime.Port>();
const clientPorts = new Map<number, Runtime.Port>();

browser.runtime.onConnect.addListener(port => {
  if (port.name.startsWith('panel-')) {
    const tabId = parseInt(port.name.split('-')[1]);
    panelPorts.set(tabId, port);

    const messageListener = (message: any) => {
      const port = clientPorts.get(tabId);
      if (port) {
        port.postMessage(message);
      }
    };

    port.onMessage.addListener(messageListener);
    port.onDisconnect.addListener(() => {
      port.onMessage.removeListener(messageListener);
      panelPorts.delete(tabId);
    });
  } else if (port.name === 'client' && port.sender?.tab?.id) {
    const tabId = port.sender.tab.id;
    panelPorts.set(tabId, port);

    const messageListener = (message: any) => {
      const port = panelPorts.get(tabId);
      if (port) {
        port.postMessage(message);
      }
    };

    port.onMessage.addListener(messageListener);
    port.onDisconnect.addListener(() => {
      port.onMessage.removeListener(messageListener);
      clientPorts.delete(tabId);
    });
  }
});

console.log('Background script loaded.');
