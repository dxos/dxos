//
// Copyright 2024 DXOS.org
//

import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

const main = async () => {
  browser.runtime.onMessage.addListener((message: any) => {
    log.info('onMessage', { message });
    return Promise.resolve({ ...message, url: window.location.href });
  });

  log.info('content ok');
};

void main();
