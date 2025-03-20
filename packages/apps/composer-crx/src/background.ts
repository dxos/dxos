//
// Copyright 2024 DXOS.org
//

import { onMessage } from 'webext-bridge/background';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

const main = async () => {
  log.info('background', { browser });

  onMessage('config', ({ data }) => {
    return { debug: data.debug ?? false };
  });
};

void main();
