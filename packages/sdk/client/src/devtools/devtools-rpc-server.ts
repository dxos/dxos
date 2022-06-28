//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { createBundledRpcServer, RpcPeer, RpcPort } from '@dxos/rpc';

import { Client } from '../api';
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
export const createDevtoolsRpcServer = async (client: Client, serviceHost: ClientServiceProvider) => {
  let server: RpcPeer;
  ((window as any).__DXOS__ as DevtoolsHook) = {
    client,
    openClientRpcServer: async () => {
      if (server) {
        log('Closing existing client RPC server.');
        server.close();
      }

      log('Opening devtools client RPC server...');
      server = createBundledRpcServer({
        services: clientServiceBundle,
        handlers: serviceHost.services,
        port
      });

      await server.open().catch(err => {
        error(`Failed to open RPC server: ${err}`);
        return false;
      });
      log('Opened devtools client RPC server.');

      return true;
    }
  };
};
