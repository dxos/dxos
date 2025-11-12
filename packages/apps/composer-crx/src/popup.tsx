//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { sendMessage } from 'webext-bridge/popup';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { Container, Popup, type PopupProps } from './components';

const Root = () => {
  const handleAdd: PopupProps['onAdd'] = async () => {
    log.info('sending...');
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      log.error('no active tab found');
      return null;
    }

    try {
      const result = await sendMessage('ping', { debug: true }, { context: 'content-script', tabId: tab.id });
      log.info('result', { result });
      return result;
    } catch (err) {
      log.catch(err);
    }

    return null;
  };

  const handleSearch: PopupProps['onSearch'] = async (text) => {
    log.info('search', { text });
    return null;
  };

  const handleLaunch: PopupProps['onLaunch'] = async () => {
    window.open('https://labs.composer.space');
  };

  return (
    <Container classNames='is-[300px]'>
      <Popup onAdd={handleAdd} onSearch={handleSearch} onLaunch={handleLaunch} />
    </Container>
  );
};

const main = async () => {
  createRoot(document.getElementById('root')!).render(<Root />);
};

void main();
