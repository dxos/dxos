//
// Copyright 2020 DXOS.org
//

// import Bridge from 'crx-bridge';
import browser from 'webextension-polyfill';

import { Client } from '@dxos/client';
import { defs } from '@dxos/config';

// import { createDevtoolsPort } from '../utils';
import { wrapPort } from '../utils/wrap-port';
import { initPanel } from './init-panel';

void (async () => {
  console.log('[DXOS devtools] Init client API started.');
  // await Bridge.sendMessage('extension.inject-client-script', {}, 'content-script');
  // const port = createDevtoolsPort();
  const port = browser.runtime.connect({ name: `panel-${browser.devtools.inspectedWindow.tabId}` });
  console.log('[DXOS devtools] Connected to panel port:', { port });
  port.postMessage({ type: 'extension.inject-client-script' });
  const rpcPort = wrapPort(port);
  const client = new Client({
    runtime: {
      client: {
        mode: defs.Runtime.Client.Mode.REMOTE
      }
    }
  }, { rpcPort });
  await waitToBeReady();
  await client.initialize();
  initPanel(client);
})();

const TIMEOUT = 1000;

function waitToBeReady () {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();

    function check () {
      chrome.devtools.inspectedWindow.eval(
        '!!(window.__DXOS__.devtoolsReady);',
        (result, isException) => {
          console.log('[DXOS devtools] Devtools ready check result:', { result, isException, now: new Date().toISOString() });
          if (!result || isException) {
            if (Date.now() - start > TIMEOUT) {
              reject(new Error('Timeout on waiting for client API to initialize.'));
            } else {
              setTimeout(check, 50);
            }
          } else {
            resolve();
          }
        }
      );
    }

    check();
  });
}
