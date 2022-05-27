//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { createBundledRpcServer, RpcPeer, RpcPort } from '@dxos/rpc';

import { clientServiceBundle, ClientServiceProvider } from '../services';
import { DevtoolsHook } from './devtools-context';

const log = debug('dxos:client:devtools');
const error = log.extend('error');

const port: RpcPort = {
  send: async message => window.postMessage({
    data: Array.from(message),
    source: 'dxos-client'
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

// Console debug access.
// TODO(burdon): Debug only.
export const createDevtoolsRpcServer = async (serviceHost: ClientServiceProvider) => {
  log('Initializing window client RPC server...');
  const server: RpcPeer = createBundledRpcServer({
    services: clientServiceBundle,
    handlers: serviceHost.services,
    port
  });
  ((window as any).__DXOS__ as DevtoolsHook) = {
    openClientRpcServer: async () => {
      console.log('Opening client RPC server...');
      await server.open().catch(err => {
        error(`Failed to open RPC server: ${err}`);
        return false;
      });

      return true;
    }
  };
  log('Initialize client RPC server finished.');
};
