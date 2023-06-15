//
// Copyright 2023 DXOS.org
//

import WebSocket from 'isomorphic-ws';
import assert from 'node:assert';
import { mkdirSync, rmSync } from 'node:fs';
import * as http from 'node:http';
import { dirname } from 'node:path';

import { ClientServices, Config, PublicKey, fromHost, ClientServicesProvider, Client, DX_RUNTIME } from '@dxos/client';
import { log } from '@dxos/log';
import { WebsocketRpcServer } from '@dxos/websocket-rpc';

import { ProxyServer, ProxyServerOptions } from './proxy';
import { parseAddress } from './util';

interface Service {
  open(): Promise<void>;
  close(): Promise<void>;
}

export type AgentOptions = {
  listen: string[];
};

/**
 * The remote agent exposes Client services via multiple transports.
 */
export class Agent {
  private _endpoints: Service[] = [];
  private _services?: ClientServicesProvider;

  // prettier-ignore
  constructor(
    private readonly _config: Config,
    private readonly _options: AgentOptions
  ) {
    assert(this._config);
  }

  async start() {
    log('starting...');

    // Create client services.
    this._services = fromHost(this._config);
    await this._services.open();

    // Global hook for debuggers.
    ((globalThis as any).__DXOS__ ??= {}).host = (this._services as any)._host;

    // Create socket servers.
    this._endpoints = (
      await Promise.all(
        this._options.listen.map(async (address) => {
          let server: Service | null = null;
          const { protocol, path } = parseAddress(address);
          switch (protocol) {
            //
            // Unix socket (accessed via CLI).
            //
            case 'unix': {
              if (!path.startsWith(DX_RUNTIME)) {
                log.warn(`Non-standard address: ${path}`);
              }

              mkdirSync(dirname(path), { recursive: true });
              rmSync(path, { force: true });
              const httpServer = http.createServer();
              httpServer.listen(path);
              server = createServer(this._services!, { server: httpServer });
              await server.open();
              break;
            }

            //
            // Web socket (accessed via browser).
            //
            case 'ws': {
              const { port } = new URL(address);
              server = createServer(this._services!, { port: parseInt(port) });
              await server.open();
              break;
            }

            //
            // HTTP server (accessed via REST API).
            // TODO(burdon): Insecure.
            //
            case 'http': {
              const { port } = new URL(address);
              server = createProxy(this._services!, this._config, { port: parseInt(port) });
              await server.open();
              break;
            }

            default: {
              log.error(`Invalid address: ${address}`);
            }
          }

          if (server) {
            log('listening', { address });
            return server;
          }
        }),
      )
    ).filter(Boolean) as Service[];

    // OpenFaaS connector.
    const faasConfig = this._config.values.runtime?.services?.faasd;
    if (faasConfig) {
      const { FaasConnector } = await import('./faas/connector');
      const connector = new FaasConnector(this._services!, faasConfig);
      await connector.open();
      this._endpoints.push(connector);
      log('connector open', { gateway: faasConfig.gateway });
    }

    log('running...');
  }

  async stop() {
    await Promise.all(this._endpoints.map((server) => server.close()));
    this._endpoints = [];

    await this._services?.close();
    this._services = undefined;

    ((globalThis as any).__DXOS__ ??= {}).host = undefined;
  }
}

const createServer = (services: ClientServicesProvider, options: WebSocket.ServerOptions) => {
  return new WebsocketRpcServer<{}, ClientServices>({
    ...options,
    onConnection: async () => {
      let start = 0;
      const connection = PublicKey.random().toHex();
      return {
        exposed: services.descriptors,
        handlers: services.services as ClientServices,
        onOpen: async () => {
          start = Date.now();
          log('open', { connection });
        },
        onClose: async () => {
          log('close', { connection, time: Date.now() - start });
        },
      };
    },
  });
};

const createProxy = (services: ClientServicesProvider, config: Config, options: ProxyServerOptions) => {
  const client = new Client({ config, services });
  return new ProxyServer(client, options);
};
