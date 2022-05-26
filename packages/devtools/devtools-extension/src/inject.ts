//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { clientServiceBundle, DevtoolsHook } from '@dxos/client';
import { createBundledRpcServer, RpcPeer, RpcPort } from '@dxos/rpc';

const log = debug('dxos:extension:inject');
const error = log.extend('error');

// eslint-disable-next-line prefer-const
let checkInterval: NodeJS.Timeout;
let checkCount = 0;

const port: RpcPort = {
  send: async message => window.postMessage({
    data: Array.from(message),
    source: 'injected-script'
  }, '*'),
  subscribe: callback => {
    const handler = (event: MessageEvent<any>) => {
      if (event.source !== window) {
        return;
      }

      const message = event.data;

      if (
        typeof message !== 'object' ||
        message === null ||
        message.source !== 'content-script'
      ) {
        return;
      }

      callback(new Uint8Array(message.data));
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }
};

const init = async () => {
  if ((window as any).__DXOS__) {
    const devtoolsContext: DevtoolsHook = (window as any).__DXOS__;

    if (checkInterval) {
      clearInterval(checkInterval);
    }

    const server: RpcPeer = createBundledRpcServer({
      services: clientServiceBundle,
      handlers: devtoolsContext.serviceHost.services,
      port
    });
    // TODO(wittjosiah): Integrate with DevtoolsHook.
    (window as any).__DXOS__.clientRpcReady = true;
    log('Client hook found.');

    await server.open();
    log('Initialize client RPC server finished.');
  } else {
    if (++checkCount > 20) {
      clearInterval(checkInterval);
      error('Initialize client RPC server failed after too many retries.');
    }
  }
};

log('Initialize client RPC server started.');
checkInterval = setInterval(init, 500);
void init();
