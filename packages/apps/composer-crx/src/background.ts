//
// Copyright 2024 DXOS.org
//

import { onMessage } from 'webext-bridge/background';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

/**
 * Background worker.
 */
const main = async () => {
  log.info('background', { browser });

  onMessage('config', ({ data }) => ({ debug: data.debug ?? false }));
};

void main();
