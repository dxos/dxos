//
// Copyright 2023 DXOS.org
//

import WebSocket from 'isomorphic-ws';
import { mkdirSync, rmSync } from 'node:fs';
import * as http from 'node:http';
import { dirname } from 'node:path';

import { ClientServices, Config, PublicKey, fromHost, ClientServicesProvider, Client } from '@dxos/client';
import { log } from '@dxos/log';
import { WebsocketRpcServer } from '@dxos/websocket-rpc';

import { ProxyServer, ProxyServerOptions } from './proxy';
import { addrFromSocket } from './util';

export type RunServicesParams = {
  listen: string[];
  config: Config;
};

// TODO(burdon): Agent.
export const runServices = async (params: RunServicesParams) => {
  log('starting...', { gateway: params.config.values.runtime?.services?.faasd?.gateway });

  // Create client services.
  const services = fromHost(params.config);

  // Global hook for debuggers.
  ((globalThis as any).__DXOS__ ??= {}).host = (services as any)._host;

  await services.open();

  // Create socket servers.
  // TODO(burdon): Create map and enable clean shutdown.
  for (const address of params.listen) {
    const protocol = address.split('://')[0];
    switch (protocol) {
      case 'unix': {
        const socketAddr = addrFromSocket(address);
        mkdirSync(dirname(socketAddr), { recursive: true });
        rmSync(socketAddr, { force: true });
        const httpServer = http.createServer();
        httpServer.listen(socketAddr);
        const server = createServer(services, { server: httpServer });
        await server.open();
        break;
      }

      case 'ws': {
        const { port } = new URL(address);
        const server = createServer(services, { port: parseInt(port) });
        await server.open();
        break;
      }

      case 'http': {
        const { port } = new URL(address);
        const server = createProxy(services, params.config, { port: parseInt(port) });
        await server.open();
        break;
      }

      default: {
        throw new Error(`Invalid address: ${address}`);
      }
    }

    log('listening', { address });
  }

  // OpenFaaS connector.
  const faasConfig = params.config.values.runtime?.services?.faasd;
  if (faasConfig) {
    const { FaasConnector } = await import('./faas/connector');
    const connector = new FaasConnector(faasConfig, services);
    await connector.open();
    log('connector open', { gateway: faasConfig.gateway });
  }

  log('running');
};

const createServer = (services: ClientServicesProvider, options: WebSocket.ServerOptions) => {
  return new WebsocketRpcServer<{}, ClientServices>({
    ...options,
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
};

const createProxy = (services: ClientServicesProvider, config: Config, options: ProxyServerOptions) => {
  const client = new Client({ config, services });
  return new ProxyServer(client, options);
};
