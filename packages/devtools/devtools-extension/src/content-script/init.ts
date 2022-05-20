//
// Copyright 2020 DXOS.org
//

import Bridge from 'crx-bridge';

import { DevtoolsHook } from '@dxos/client';

import { createWindowPort } from '../utils';
import { RpcClientAPI } from './client-api';

Bridge.allowWindowMessaging('dxos.devtools');

// eslint-disable-next-line prefer-const
let checkInterval: NodeJS.Timeout;
let checkCount = 0;

const init = async () => {
  checkCount++;
  if ((window as any).__DXOS__) {
    const devtoolsContext: DevtoolsHook = (window as any).__DXOS__;

    if (checkInterval) {
      clearInterval(checkInterval);
    }
    const port = createWindowPort();
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
