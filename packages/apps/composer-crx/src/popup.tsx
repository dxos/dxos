//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { sendMessage } from 'webext-bridge/popup';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { Popup, Container, type PopupProps } from './components';

const Root = () => {
  const handleAdd: PopupProps['onAdd'] = async () => {
    log.info('sending...');
    const result = await sendMessage('ping', { debug: true }, 'content-script');
    log.info('handleAdd', { result });
    return result;
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

const main = async () => {
  createRoot(document.getElementById('root')!).render(<Root />);
  log.info('popup ok');
};

void main();
