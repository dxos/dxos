//
// Copyright 2020 DXOS.org
//

import Bridge from 'crx-bridge';

import { initDevToolClientApi } from './handlers';

Bridge.setNamespace('dxos.devtools');
Bridge.allowWindowMessaging('dxos.devtools');

// ensure that client is ready before init
let started = false;
let checkCount = 0;

// eslint-disable-next-line prefer-const
let loadCheckInterval: NodeJS.Timeout;

const init = async () => {
  if (checkCount++ > 30) {
    if (loadCheckInterval) {
      clearInterval(loadCheckInterval);
    }
    await Bridge.sendMessage('api.timeout', {}, 'devtools');
    return;
  }

  if ((window as any).__DXOS__ && !started) {
    started = true;

    console.log('[DXOS devtools] Init client API');
    initDevToolClientApi({
      hook: (window as any).__DXOS__,
      bridge: Bridge
    });

    if (loadCheckInterval) {
      clearInterval(loadCheckInterval);
    }
    await Bridge.sendMessage('api.ready', {}, 'devtools');
  }
};

loadCheckInterval = setInterval(init, 1000);

init();
