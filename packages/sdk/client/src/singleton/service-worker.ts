//
// Copyright 2020 DXOS.org
//

import { SingletonMessage } from '../packlets/proxy';

// Note: Check 'Update on reload' in browser application devtools ease development.

// import debug from 'debug';
// import browser, { Runtime } from 'webextension-polyfill';

// const log = debug('dxos:extension:background');
// const error = log.extend('error');

// const panelPorts = new Map<number, Runtime.Port>();
// const contentPorts = new Map<number, Runtime.Port>();

// browser.runtime.onConnect.addListener(port => {
//   log(`Connected to port: ${port.name}`);

//   // Forward messages from devtools panel to content script.
//   if (port.name.startsWith('panel-')) {
//     const tabId = parseInt(port.name.split('-')[1]);
//     panelPorts.set(tabId, port);

//     const messageListener = (message: any) => {
//       const port = contentPorts.get(tabId);
//       if (port) {
//         log(`Forwarding message from panel to content on tab ${tabId}:`, message);
//         port.postMessage(message);
//       } else {
//         error(`Missing content port for tab ${tabId}`);
//       }
//     };

//     port.onMessage.addListener(messageListener);
//     port.onDisconnect.addListener(() => {
//       port.onMessage.removeListener(messageListener);
//       panelPorts.delete(tabId);
//     });
//   // Forward messages from content script to devtools panel.
//   } else if (port.name === 'content' && port.sender?.tab?.id) {
//     const tabId = port.sender.tab.id;
//     contentPorts.set(tabId, port);

//     const messageListener = (message: any) => {
//       const port = panelPorts.get(tabId);
//       if (port) {
//         log(`Forwarding message from content to panel on tab ${tabId}:`, message);
//         port.postMessage(message);
//       } else {
//         error(`Missing panel port for tab ${tabId}`);
//       }
//     };

//     port.onMessage.addListener(messageListener);
//     port.onDisconnect.addListener(() => {
//       port.onMessage.removeListener(messageListener);
//       contentPorts.delete(tabId);
//     });
//   }
// });

// log('Background script initialized.');

const communicationPorts = new Map<string, MessagePort>();
let clientId: string;

const initializePort = (sourceId: string) => {
  const clientPort = communicationPorts.get(clientId);
  if (!clientPort) {
    return;
  }

  clientPort.postMessage({ type: SingletonMessage.SETUP_PORT, sourceId });
};

// https://stackoverflow.com/questions/38168276/navigator-serviceworker-controller-is-null-until-page-refresh
self.addEventListener('install', event => {
  // eslint-disable-next-line
  // @ts-ignore
  event.waitUntil(self.skipWaiting()); // Activate worker immediately
});

self.addEventListener('activate', event => {
  // eslint-disable-next-line
  // @ts-ignore
  event.waitUntil(self.clients.claim()); // Become available to all pages
});

self.addEventListener('message', async event => {
  const sourceId = (event.source as unknown as WindowClient).id;
  const message = event.data;
  console.log('sw', { message, sourceId });

  switch (message?.type) {
    // TODO(wittjosiah): Port cleanup.
    // TODO(wittjosiah): Client host transfer.
    case SingletonMessage.INITIALIZE_CHANNEL: {
      const port = event.ports[0];
      communicationPorts.set(sourceId, port);
      if (communicationPorts.size > 1) {
        initializePort(sourceId);
      } else {
        port.postMessage({ type: SingletonMessage.SETUP_CLIENT });
      }
      break;
    }

    case SingletonMessage.CLIENT_READY: {
      clientId = sourceId;
      [...communicationPorts.keys()].forEach(id => {
        if (id !== sourceId) {
          initializePort(id);
        }
      });
      break;
    }

    case SingletonMessage.PORT_READY: {
      const forwardPort = communicationPorts.get(message.sourceId);
      forwardPort?.postMessage({ type: SingletonMessage.PORT_READY });
      break;
    }

    case SingletonMessage.APP_MESSAGE: {
      const clientPort = communicationPorts.get(clientId);
      clientPort?.postMessage({ ...message, sourceId });
      break;
    }

    case SingletonMessage.CLIENT_MESSAGE: {
      const forwardPort = communicationPorts.get(message.sourceId);
      forwardPort?.postMessage(message);
      break;
    }
  }
});
