//
// Copyright 2023 DXOS.org
//

import { assert } from 'node:console';
import { mkdirSync, rmSync } from 'node:fs';
import * as http from 'node:http';
import { dirname } from 'node:path';

import { Client, ClientServices, Config, PublicKey } from '@dxos/client';
import { fromHost } from '@dxos/client-services';
import { log } from '@dxos/log';
import { WebsocketRpcServer } from '@dxos/websocket-rpc';

export type RunDaemonParams = {
  profile: string;
  listen: string;
};

export const runDaemon = async (params: RunDaemonParams) => {
  const config = new Config({
    runtime: {
      services: {
        signaling: [
          {
            server: 'wss://kube.dxos.org/.well-known/dx/signal'
          },
          {
            server: 'wss://dev.kube.dxos.org/.well-known/dx/signal'
          }
        ]
      }
    }
  });

  const client = new Client({
    config,
    services: fromHost(config)
  });

  await client.initialize();
  log.info('client initialized', { identity: client.halo.identity.get()?.identityKey });

  const httpServer = http.createServer();

  assert(params.listen.startsWith('unix://'), 'Invalid listen address.');
  const socketAddr = params.listen.slice('unix://'.length);
  mkdirSync(dirname(socketAddr), { recursive: true });
  rmSync(socketAddr, { force: true });
  httpServer.listen(socketAddr);

  const server = new WebsocketRpcServer<{}, ClientServices>({
    server: httpServer,
    onConnection: async () => {
      const id = PublicKey.random().toHex();
      log.info('connection', { id });

      return {
        exposed: client.services.descriptors,
        handlers: client.services.services as ClientServices,
        onOpen: async () => {
          log.info('open', { id });
        },
        onClose: async () => {
          log.info('close', { id });
        }
      };
    }
  });

  await server.open();
  log.info('listening', { socket: params.listen });
};
