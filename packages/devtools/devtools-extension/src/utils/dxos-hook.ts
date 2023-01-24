//
// Copyright 2022 DXOS.org
//

import { sleep } from '@dxos/async';
import { log } from '@dxos/log';

const error = log.extend('error');

// TODO(burdon): ?
const checkForDXOS = () =>
  new Promise<boolean>((resolve, reject) => {
    // TODO(wittjosiah): Switch to using webextension-polyfill once types are improved.
    chrome.devtools.inspectedWindow.eval('!!(window.__DXOS__);', async (result, exception) => {
      if (exception) {
        reject(exception);
      }

      resolve(!!result);
    });
  });

/**
 * Wait for DXOS client hook on the inspected winwod to be available.
 *
 * @param timeout Total timeout in ms.
 * @param interval Check every interval ms.
 */
// TODO(burdon): Rename.
export const waitForDXOS = async (timeout = 100000, interval = 1000) => {
  while (timeout > 0) {
    const isReady = await checkForDXOS().catch(error);
    if (isReady) {
      return;
    }

    log('DXOS hook not yet available...');
    await sleep(interval);
    timeout -= interval;
  }

  throw new Error('DXOS hook not available.');
};
