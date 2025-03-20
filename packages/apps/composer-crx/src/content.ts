//
// Copyright 2024 DXOS.org
//

import { onMessage } from 'webext-bridge/content-script';

import { log } from '@dxos/log';

const main = async () => {
  log.info('content...');

  onMessage('ping', async ({ sender, data }) => {
    log.info('onMessage', { sender, data });

    // const config = await sendMessage('config', { sync: false }, 'background');
    // log.info('onMessage', { sender, data, config });

    return window.location.href;
  });

  // import browser from 'webextension-polyfill';
  // browser.runtime.onMessage.addListener((message: any) => {
  //   log.info('onMessage', { message });
  //   return Promise.resolve({ ...message, url: window.location.href });
  // });

  log.info('content ok');
};

void main();
