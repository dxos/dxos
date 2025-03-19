//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import * as Comlink from 'comlink';
import React from 'react';
import { createRoot } from 'react-dom/client';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { Popup, Container, type PopupProps } from './components';
import { type Context } from './protocol';

// TODO(burdon): Util.
const runAsync = (cb: () => Promise<void>) => {
  const t = setTimeout(cb);
  return () => clearTimeout(t);
};

const Root = () => {
  const handleAdd: PopupProps['onAdd'] = () => {
    return runAsync(async () => {
      // TODO(burdon): Send message to context extension.
      // const content = await parser.parse(window.location.href);
      // log.info('add', { content });
    });
  };

  const handleSearch: PopupProps['onSearch'] = (text) => {
    log.info('search', { text });
  };

  const handleLaunch: PopupProps['onLaunch'] = () => {
    window.open('https://labs.composer.space');
  };

  return (
    <Container classNames='w-[300px]'>
      <Popup onAdd={handleAdd} onSearch={handleSearch} onLaunch={handleLaunch} />
    </Container>
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
