//
// Copyright 2023 DXOS.org
//

import { mkdirSync, rmSync } from 'node:fs';
import * as http from 'node:http';
import { dirname } from 'node:path';

import { ClientServices, Config, PublicKey, fromHost } from '@dxos/client';
import { log } from '@dxos/log';
import { WebsocketRpcServer } from '@dxos/websocket-rpc';

import { addrFromSocket } from './util';

export type RunServicesParams = {
  listen: string[];
  config: Config;
};

export class Agent {}

export const runServices = async (params: RunServicesParams) => {
  log('running', { gateway: params.config.values.runtime?.services?.faasd?.gateway });
  const services = fromHost(params.config);

  // Global hook for debuggers.
  ((globalThis as any).__DXOS__ ??= {}).host = (services as any)._host;

  await services.open();
  log('open');

  const httpServer = http.createServer();

  // Sockets.
  for (const listenAddr of params.listen) {
    if (listenAddr.startsWith('unix://')) {
      const socketAddr = addrFromSocket(listenAddr);
      mkdirSync(dirname(socketAddr), { recursive: true });
      rmSync(socketAddr, { force: true });
      httpServer.listen(socketAddr);

      const server = new WebsocketRpcServer<{}, ClientServices>({
        server: httpServer,
        onConnection: async () => {
          const id = PublicKey.random().toHex();
          log('connection', { id });

          return {
            exposed: services.descriptors,
            handlers: services.services as ClientServices,
            onOpen: async () => {
              log('open', { id });
            },
            onClose: async () => {
              log('close', { id });
            },
          };
        },
      });

      await server.open();
    } else if (listenAddr.startsWith('ws://')) {
      const { port } = new URL(listenAddr);

      const server = new WebsocketRpcServer<{}, ClientServices>({
        port: parseInt(port),
        onConnection: async () => {
          const id = PublicKey.random().toHex();
          log('connection', { id });

          return {
            exposed: services.descriptors,
            handlers: services.services as ClientServices,
            onOpen: async () => {
              log('open', { id });
            },
            onClose: async () => {
              log('close', { id });
            },
          };
        },
      });

      await server.open();
    } else {
      throw new Error(`Unsupported listen address: ${listenAddr}`);
    }
  }

  log('listening', { socket: params.listen });

  // OpenFaaS connector.
  const faasConfig = params.config.values.runtime?.services?.faasd;
  if (faasConfig) {
    const { FaasConnector } = await import('./faas/connector');
    const connector = new FaasConnector(faasConfig, services);
    await connector.open();
    log('connected', { gateway: faasConfig.gateway });
  }
};
