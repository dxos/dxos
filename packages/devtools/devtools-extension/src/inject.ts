//
// Copyright 2020 DXOS.org
//

import { DevtoolsHook } from '@dxos/client';
import { RpcPort } from '@dxos/rpc';

import { RpcClientAPI } from './utils/client-api';

// eslint-disable-next-line prefer-const
let checkInterval: NodeJS.Timeout;
let checkCount = 0;

const port: RpcPort = {
  send: async message => {
    console.log('[inject] send', { message });
    window.postMessage({
      data: message,
      source: 'dxos-client'
    }, '*');
  },
  subscribe: callback => {
    window.addEventListener('message', event => {
      if (event.source !== window) {
        return;
      }

      const message = event.data;

      if (
        typeof message !== 'object' ||
        message === null ||
        message.source !== 'dxos-devtools'
      ) {
        return;
      }

      console.log('[inject] window.message', { message });
      callback(event.data);
    });
  }
};

const init = async () => {
  checkCount++;
  console.log({ checkCount, hook: (window as any).__DXOS__ });
  if ((window as any).__DXOS__) {
    const devtoolsContext: DevtoolsHook = (window as any).__DXOS__;

    if (checkInterval) {
      clearInterval(checkInterval);
    }

    const clientApi = new RpcClientAPI(port, devtoolsContext.serviceHost.services);
    (window as any).__DXOS__.devtoolsReady = true;
    console.log('[DXOS devtools] Devtools ready.', { clientReady: devtoolsContext.client.initialized, now: new Date().toISOString() });
    await clientApi.run();
    console.log('[DXOS devtools] Init client API finished.');
  } else {
    if (checkCount > 20) {
      clearInterval(checkInterval);
      console.log('[DXOS devtools] Init client API failed after too many retries.');
    }
  }
};

console.log('[DXOS devtools] Init client API started.');
checkInterval = setInterval(init, 500);
void init();
