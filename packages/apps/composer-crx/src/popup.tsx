//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import * as Comlink from 'comlink';
import { type Remote } from 'comlink';
import React, { type FC } from 'react';
import { createRoot } from 'react-dom/client';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { Popup, Container, type PopupProps } from './components';
import { type Context } from './protocol';

const Root: FC<{ context: Remote<Context> }> = ({ context }) => {
  const handleAdd: PopupProps['onAdd'] = async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      log.error('no active tab found.');
      return null;
    }

    try {
      log.info('sending...', { tab });
      const response = await browser.tabs.sendMessage(tab.id, { action: 'add' });
      log.info('response', { response });
      if (typeof response === 'object' && response && 'url' in response) {
        return response.url as string;
      }
    } catch (err) {
      log.catch(err);
    }

    return null;
  };

  const handleSearch: PopupProps['onSearch'] = async (text) => {
    log.info('search', { text });
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      log.error('no active tab found.');
      return null;
    }

    try {
      log.info('sending...', { tab, text });
      const response = await browser.tabs.sendMessage(tab.id, { action: 'search', text });
      log.info('response', { response });
      if (typeof response === 'object' && response && 'url' in response) {
        return response.url as string;
      }
    } catch (err) {
      log.catch(err);
    }

    return null;
  };

  const handleLaunch: PopupProps['onLaunch'] = async () => {
    window.open('https://labs.composer.space');
  };

  return (
    <Container classNames='w-[300px]'>
      <Popup onAdd={handleAdd} onSearch={handleSearch} onLaunch={handleLaunch} />
    </Container>
  );
};

const createEndpoint = (tabId: number): Comlink.Endpoint => {
  log.info('creating endpoint...', { tabId });
  const listeners = new Map<string, (data: any) => void>();

  return Comlink.proxy({
    postMessage: (message: any) => {
      log.info('postMessage', { message });
      void browser.tabs.sendMessage(tabId, { id: message.id, data: message.data });
    },
    addEventListener: (type: string, listener: unknown) => {
      log.info('addEventListener', { type, listener });
      const comlinkListener = listener as { name: string; handleEvent: (data: any) => void };
      listeners.set(comlinkListener.name, comlinkListener.handleEvent);

      browser.runtime.onMessage.addListener((message: unknown, sender, _sendResponse): true => {
        log.info('onMessage', { message, sender });
        if (typeof message === 'object' && message && 'id' in message) {
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
    log.error('no active tab found.');
    return;
  }

  const context = Comlink.wrap<Context>(createEndpoint(tab.id));

  createRoot(document.getElementById('root')!).render(<Root context={context} />);
  log.info('popup ok');
};

void main();
