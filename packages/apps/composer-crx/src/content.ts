//
// Copyright 2024 DXOS.org
//

import { onMessage, sendMessage } from 'webext-bridge/content-script';

import { log } from '@dxos/log';

import { pickAndHarvest } from './picker';

/**
 * Content script — loaded on every page at document_start. Hosts the DOM
 * picker; forwards the resulting clip to the background worker which owns
 * discovery + delivery + user notification.
 *
 * The popup cannot reliably await a round-trip reply because it closes when
 * the user mouses onto the page to pick. Instead the popup fires a one-way
 * `start-picker` message and we push the finished clip to the background via
 * its own `clip` message.
 */
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

  onMessage('start-picker', async () => {
    const clip = await pickAndHarvest();
    if (!clip) {
      return { clip: null };
    }
    try {
      await sendMessage('clip', { clip }, 'background');
    } catch (err) {
      log.catch(err);
    }
    return { clip };
  });
};

void main();
