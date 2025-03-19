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

// Create a proper endpoint wrapper for Chrome's messaging
const createEndpoint = () => {
  const listeners = new Map<string, (data: any) => void>();

  browser.runtime.onMessage.addListener((message: unknown, _sender, _sendResponse): true => {
    if (typeof message === 'object' && message && 'id' in message && 'data' in message) {
      const typedMessage = message as { id: string; data: unknown };
      const listener = listeners.get(typedMessage.id);
      if (listener) {
        listener(typedMessage.data);
      }
    }
    return true;
  });

  return Comlink.proxy({
    postMessage: (message: any) => {
      void browser.runtime.sendMessage({ id: message.id, data: message.data });
    },
    addEventListener: (_type: string, listener: unknown) => {
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

  // eslint-disable-next-line no-console
  log.info('main', { browser });
};

void main();
