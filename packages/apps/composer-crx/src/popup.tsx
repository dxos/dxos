//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import * as Comlink from 'comlink';
import React from 'react';
import { createRoot } from 'react-dom/client';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';
import { ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

import { Popup } from './components';
import { type Context } from './protocol';

const Root = () => {
  return (
    <ThemeProvider tx={defaultTx} themeMode='dark'>
      <div className='dark'>
        <Popup />
      </div>
    </ThemeProvider>
  );
};

const createEndpoint = (tabId: number): Comlink.Endpoint => {
  const listeners = new Map<string, (data: any) => void>();

  return Comlink.proxy({
    postMessage: (message: any) => {
      void browser.tabs.sendMessage(tabId, { id: message.id, data: message.data });
    },
    addEventListener: (_type: string, listener: unknown) => {
      const comlinkListener = listener as { name: string; handleEvent: (data: any) => void };
      listeners.set(comlinkListener.name, comlinkListener.handleEvent);

      browser.runtime.onMessage.addListener((message: unknown, _sender, _sendResponse): true => {
        if (typeof message === 'object' && message && 'id' in message && 'data' in message) {
          const typedMessage = message as { id: string; data: unknown };
          if (typedMessage.id === comlinkListener.name) {
            comlinkListener.handleEvent(typedMessage.data);
          }
        }
        return true;
      });
    },
    removeEventListener: (_type: string, listener: unknown) => {
      const comlinkListener = listener as { name: string };
      listeners.delete(comlinkListener.name);
    },
  });
};

const main = async () => {
  // Get the active tab.
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    log.error('No active tab found.');
    return;
  }

  const context = Comlink.wrap<Context>(createEndpoint(tab.id));
  const currentUrl = await context.getCurrentUrl();
  log.info('context', { currentUrl });

  createRoot(document.getElementById('root')!).render(<Root />);
};

void main();
