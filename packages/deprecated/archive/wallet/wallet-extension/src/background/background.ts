//
// Copyright 2021 DXOS.org
//

import browser, { Runtime } from 'webextension-polyfill';

import { wrapPort } from '../utils/wrapPort';
import { BackgroundServer } from './background-server';

void (async () => {
  const server = new BackgroundServer();
  void server.open();
  browser.runtime.onConnect.addListener((port: Runtime.Port) => {
    console.log(`Background process connected on port ${port.name}`);

    void server.handlePort(wrapPort(port));
  });
})();
