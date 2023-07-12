//
// Copyright 2023 DXOS.org
//

import WebSocket from 'isomorphic-ws';
import assert from 'node:assert';
import { mkdirSync, rmSync } from 'node:fs';
import * as http from 'node:http';
import { dirname } from 'node:path';

import { fromHost, ClientServices, Config, Client, ClientServicesProvider, PublicKey } from '@dxos/client';
import { log } from '@dxos/log';
import { WebsocketRpcServer } from '@dxos/websocket-rpc';

import { Monitor, MonitorOptions, Plugin, ProxyServer, ProxyServerOptions } from './plugins';
import { lockFilePath, parseAddress } from './util';

export type AgentOptions = {
  profile: string;
  listen: string[]; // TODO(burdon): Rename endpoints/plugins.
  monitor?: MonitorOptions; // TODO(burdon): YML file?
};

/**
 * The remote agent exposes Client services via multiple transports.
 */
export class Agent {
  private _endpoints: Plugin[] = [];
  private _plugins: Plugin[] = []; // TODO(burdon): Merge with endpoints?
  private _client?: Client;
  private _clientServices?: ClientServicesProvider;

  // prettier-ignore
  constructor(
    private readonly _config: Config,
    private readonly _options: AgentOptions
  ) {
    assert(this._config);
    assert(this._options);
  }

  // TODO(burdon): Lock file (per profile). E.g., isRunning is false if running manually.
  //  https://www.npmjs.com/package/lockfile

  async start() {
    await this.stop();

    // Create client services.
    // TODO(burdon): Check lock.
    this._clientServices = fromHost(this._config, { lockKey: lockFilePath(this._options.profile) });
    await this._clientServices.open();

    // Create client.
    // TODO(burdon): Move away from needing client for epochs and proxy?
    this._client = new Client({ config: this._config, services: this._clientServices });
    await this._client.initialize();

    // Global hook for debuggers.
    ((globalThis as any).__DXOS__ ??= {}).host = (this._clientServices as any)._host;

    // Create socket servers.
    let socketUrl: string | undefined;
    this._endpoints = (
      await Promise.all(
        this._options.listen.map(async (address) => {
          let server: Plugin | null = null;
          const { protocol, path } = parseAddress(address);
          switch (protocol) {
            //
            // Unix socket (accessed via CLI).
            //
            case 'unix': {
              socketUrl = address;
              mkdirSync(dirname(path), { recursive: true });
              rmSync(path, { force: true });
              const httpServer = http.createServer();
              httpServer.listen(path);
              server = createServer(this._clientServices!, { server: httpServer });
              await server.open();
              break;
            }

            //
            // Web socket (accessed via devtools).
            // TODO(burdon): Insecure.
            //
            case 'ws': {
              const { port } = new URL(address);
              server = createServer(this._clientServices!, { port: parseInt(port) });
              await server.open();
              break;
            }

            //
            // HTTP server (accessed via REST API).
            // TODO(burdon): Insecure.
            //
            case 'http': {
              const { port } = new URL(address);
              server = createProxy(this._client!, { port: parseInt(port) });
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
    ).filter(Boolean) as Plugin[];

    // Epoch monitor.
    if (this._options.monitor) {
      this._plugins.push(new Monitor(this._client!, this._clientServices!, this._options.monitor!));
    }

    // Start plugins.
    for (const plugin of this._plugins) {
      await plugin.open();
    }

    // OpenFaaS connector.
    // TODO(burdon): Manual trigger.
    const faasConfig = this._config.values.runtime?.services?.faasd;
    if (faasConfig) {
      const { FaasConnector } = await import('./plugins/faas/connector');
      const connector = new FaasConnector(this._clientServices!, faasConfig, { clientUrl: socketUrl });
      await connector.open();
      this._endpoints.push(connector);
      log('connector open', { gateway: faasConfig.gateway });
    }

    log('running...');
  }

  async stop() {
    // Stop plugins.
    await Promise.all(this._plugins.map((plugin) => plugin.close()));
    this._plugins = [];

    // Close service endpoints.
    await Promise.all(this._endpoints.map((server) => server.close()));
    this._endpoints = [];

    // Close client and services.
    await this._client?.destroy();
    await this._clientServices?.close();
    this._client = undefined;
    this._clientServices = undefined;

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

const createProxy = (client: Client, options: ProxyServerOptions) => {
  return new ProxyServer(client, options);
};
