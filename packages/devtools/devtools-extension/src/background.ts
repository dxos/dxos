//
// Copyright 2020 DXOS.org
//

import browser, { type Runtime } from 'webextension-polyfill';

import { log } from '@dxos/log';

const panelPorts = new Map<number, Runtime.Port>();
const contentPorts = new Map<number, Runtime.Port>();

browser.runtime.onConnect.addListener((port) => {
  log(`Connected to port: ${port.name}`);

  // Forward messages from devtools panel to content script.
  if (port.name.startsWith('panel-')) {
    const tabId = parseInt(port.name.split('-')[1]);
    panelPorts.set(tabId, port);

    const messageListener = (message: any) => {
      const port = contentPorts.get(tabId);
      if (port) {
        log(`Forwarding message from panel to content on tab ${tabId}:`, message);
        port.postMessage(message);
      } else {
        log.warn(`Missing content port for tab ${tabId}`);
      }
    };

    port.onMessage.addListener(messageListener);
    port.onDisconnect.addListener(() => {
      port.onMessage.removeListener(messageListener);
      panelPorts.delete(tabId);
    });
    // Forward messages from content script to devtools panel.
  } else if (port.name === 'content' && port.sender?.tab?.id) {
    const tabId = port.sender.tab.id;
    contentPorts.set(tabId, port);

    const messageListener = (message: any) => {
      const port = panelPorts.get(tabId);
      if (port) {
        log(`Forwarding message from content to panel on tab ${tabId}:`, message);
        port.postMessage(message);
      } else {
        log.error(`Missing panel port for tab ${tabId}`);
      }
    };

    port.onMessage.addListener(messageListener);
    port.onDisconnect.addListener(() => {
      port.onMessage.removeListener(messageListener);
      contentPorts.delete(tabId);
    });
  }
});

log('Background script initialized.');
