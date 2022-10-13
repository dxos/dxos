//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';
// import debug from 'debug'
// import { log } from '@dxos/log'

import { createWorkerPort } from '@dxos/rpc-tunnel';

// debug.enable('dxos:*')
// log.config.filter='debug'

import { App } from './App';

if (typeof SharedWorker !== 'undefined') {
  void (async () => {
    const worker = new SharedWorker(
      new URL('./shared-worker', import.meta.url),
      { type: 'module' }
    );
    const rpcPort = createWorkerPort({ channel: 'dxos:app', port: worker.port });

    // TODO(wittjosiah): StrictMode causing issues with the react sdk, re-enable once fixed.
    createRoot(document.getElementById('root')!)
      .render(
          // <StrictMode>
          <App rpcPort={rpcPort} />
          // </StrictMode>
      );
  })();
} else {
  throw new Error('Requires a browser with support for shared workers.');
}
