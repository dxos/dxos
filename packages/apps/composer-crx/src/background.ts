//
// Copyright 2024 DXOS.org
//

import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

const main = async () => {
  log.info('background', { browser });
};

void main();
