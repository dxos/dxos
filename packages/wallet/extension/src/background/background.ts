//
// Copyright 2021 DXOS.org
//

import { browser, Runtime } from 'webextension-polyfill-ts';

import { wrapPort } from '../utils/wrapPort';
import { BackgroundServer } from './background-server';

(async () => {
  browser.runtime.onConnect.addListener((port: Runtime.Port) => {
    console.log(`Background process connected on port ${port.name}`);

    const server = new BackgroundServer(wrapPort(port));
    server.run();
  });
})();
