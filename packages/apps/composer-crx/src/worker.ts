//
// Copyright 2024 DXOS.org
//

import * as Comlink from 'comlink';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { type Context } from './protocol';

const api: Context = {
  getCurrentUrl: () => window.location.href,
  getPageTitle: () => document.title,
  getSelectedText: () => window.getSelection()?.toString() || '',
};

// TODO(burdon): Alt:
// - https://www.npmjs.com/package/webext-bridge
// - https://www.npmjs.com/package/webext-messenger

// Create a proper endpoint wrapper for Chrome's messaging
const createEndpoint = (): Comlink.Endpoint => {
  log.info('creating endpoint...');
  const listeners = new Map<string, (data: any) => void>();

  browser.runtime.onMessage.addListener((message: unknown, _sender, _sendResponse): true => {
    log.info('onMessage', { message });
    if (typeof message === 'object' && message && 'id' in message) {
      const typedMessage = message as { id: string; data: unknown };
      const listener = listeners.get(typedMessage.id);
      log.info('listener', { listener });
      if (listener) {
        listener(typedMessage.data);
      }
    }

    return true;
  });

  return Comlink.proxy({
    postMessage: (message: any) => {
      log.info('postMessage', { message });
      void browser.runtime.sendMessage({ id: message.id, data: message.data });
    },
    addEventListener: (type: string, listener: unknown) => {
      log.info('addEventListener', { type, listener });
      const comlinkListener = listener as { name: string; handleEvent: (data: any) => void };
      listeners.set(comlinkListener.name, comlinkListener.handleEvent);
    },
    removeEventListener: (_type: string, listener: unknown) => {
      const comlinkListener = listener as { name: string };
      listeners.delete(comlinkListener.name);
    },
  });
};

const main = async () => {
  // Expose the API using Comlink
  Comlink.expose(api, createEndpoint());

  log.info('content ok');
};

void main();
