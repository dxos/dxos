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

import { Monitor, MonitorOptions, Plugin, ProxyServer } from './plugins';
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
  private _client?: Client;
  private _clientServices?: ClientServicesProvider;
  private _plugins: Plugin[] = [];

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

  // TODO(burdon): Initialize/destroy.
  async initialize() {}

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

    // TODO(burdon): Plugin dependencies.
    let socketUrl: string | undefined;

    // TODO(burdon): Replace with config.
    for await (const address of this._options.listen) {
      let plugin: Plugin | null = null;
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
          plugin = createServer(this._clientServices!, { server: httpServer });
          break;
        }

        //
        // Web socket (accessed via devtools).
        // TODO(burdon): Insecure.
        //
        case 'ws': {
          const { port } = new URL(address);
          plugin = createServer(this._clientServices!, { port: parseInt(port) });
          break;
        }

        //
        // HTTP server (accessed via REST API).
        // TODO(burdon): Insecure.
        //
        case 'http': {
          const { port } = new URL(address);
          plugin = new ProxyServer(this._client!, { port: parseInt(port) });
          break;
        }

        default: {
          log.error(`Invalid address: ${address}`);
        }
      }

      if (plugin) {
        this._plugins.push(plugin);
      }
    }

    // Epoch monitor.
    if (this._options.monitor) {
      this._plugins.push(new Monitor(this._client!, this._clientServices!, this._options.monitor!));
    }

    // OpenFaaS connector.
    // TODO(burdon): Manual trigger.
    const faasConfig = this._config.values.runtime?.services?.faasd;
    if (faasConfig) {
      const { FaasConnector } = await import('./plugins/faas/connector');
      const connector = new FaasConnector(this._clientServices!, faasConfig, { clientUrl: socketUrl });
      this._plugins.push(connector);
    }

    // Open plugins.
    for (const plugin of this._plugins) {
      await plugin.open();
      log('open', { plugin });
    }

    log('running...');
  }

  async stop() {
    // Close plugins.
    await Promise.all(this._plugins.map((plugin) => plugin.close()));
    this._plugins.length = 0;

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
