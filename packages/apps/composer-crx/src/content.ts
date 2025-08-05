//
// Copyright 2024 DXOS.org
//

import { onMessage, sendMessage } from 'webext-bridge/content-script';

import { log } from '@dxos/log';

const main = async () => {
  log.info('content-script');

  onMessage('ping', async ({ sender, data }) => {
    log.info('ping', { sender, data });

    try {
      const config = await sendMessage('config', {}, 'background');
      log.info('config', { config });
    } catch (err) {
      log.catch(err);
    }

    return window.location.href;
  });
};

void main();
