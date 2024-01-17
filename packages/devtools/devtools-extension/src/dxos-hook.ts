//
// Copyright 2022 DXOS.org
//

import browser from 'webextension-polyfill';

import { sleep } from '@dxos/async';
import { log } from '@dxos/log';

// Validates whether the global client hook (__DXOS__) is available yet on the inspected window.
// This becomes available after the DXOS client in the app is initialized.
const checkForClientHook = async () => {
  try {
    log('checking for client hook...');
    const [result, exception] = await browser.devtools.inspectedWindow.eval('!!(window.__DXOS__);');
    exception && log.error('Error checking for client hook', exception);
    return !!result;
  } catch (err) {
    log.catch('Error checking for client hook', err);
    return false;
  }
};

/**
 * Wait for DXOS client hook on the inspected window to be available.
 *
 * @param timeout Total timeout in ms.
 * @param interval Check every interval ms.
 */
export const waitForClientHook = async (timeout = 100000, interval = 1000) => {
  while (timeout > 0) {
    const isReady = await checkForClientHook();
    if (isReady) {
      log('Found DXOS hook');
      return;
    }

    log('DXOS hook not yet available...');
    await sleep(interval);
    timeout -= interval;
  }

  throw new Error('DXOS hook not available.');
};
