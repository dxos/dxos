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

const init = () => {
  if (checkCount++ > 30) {
    if (loadCheckInterval) {
      clearInterval(loadCheckInterval);
    }
    Bridge.sendMessage('api.timeout', {}, 'devtools');
    return;
  }

  if (window.__DXOS__ && !started) {
    started = true;

    console.log('[DXOS devtools] Init client API');
    initDevToolClientApi({
      hook: window.__DXOS__,
      bridge: Bridge
    });

    if (loadCheckInterval) {
      clearInterval(loadCheckInterval);
    }
    Bridge.sendMessage('api.ready', {}, 'devtools');
  }
};

const loadCheckInterval = setInterval(init, 1000);

init();
