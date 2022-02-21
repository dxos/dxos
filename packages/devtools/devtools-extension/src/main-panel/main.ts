//
// Copyright 2020 DXOS.org
//

import Bridge from 'crx-bridge';

import { Client } from '@dxos/client';
import { defs } from '@dxos/config';

import { createDevtoolsPort } from '../utils';
import { initPanel } from './init-panel';

void (async () => {
  await Bridge.sendMessage('extension.inject-client-script', {}, 'content-script');
  const port = createDevtoolsPort();
  const client = new Client({
    runtime: {
      client: {
        mode: defs.Runtime.Client.Mode.REMOTE
      }
    }
  }, { rpcPort: port });
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
