//
// Copyright 2023 DXOS.org
//

import WebSocket from 'isomorphic-ws';
import { mkdirSync, rmSync } from 'node:fs';
import * as http from 'node:http';
import { dirname } from 'node:path';

import { Config, Client, PublicKey } from '@dxos/client';
import { ClientServices, ClientServicesProvider, fromHost } from '@dxos/client/services';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { tracer } from '@dxos/util';
import { WebsocketRpcServer } from '@dxos/websocket-rpc';

import { Plugin } from './plugins';
import { lockFilePath, parseAddress } from './util';

interface Service {
  open(): Promise<void>;
  close(): Promise<void>;
}

export type AgentOptions = {
  config: Config;
  profile: string;
  plugins?: Plugin[];
  metrics?: boolean;
  protocol?: {
    socket: string;
    webSocket?: number;
  };
};

/**
 * The remote agent exposes Client services via multiple transports.
 */
export class Agent {
  private readonly _plugins: Plugin[];

  private _client?: Client;
  private _clientServices?: ClientServicesProvider;
  private _services: Service[] = [];

  constructor(private readonly _options: AgentOptions) {
    invariant(this._options);
    this._plugins = (this._options.plugins?.filter(Boolean) as Plugin[]) ?? [];
    if (this._options.metrics) {
      tracer.start();
    }
  }

  async start() {
    invariant(!this._clientServices);
    log('starting...');

    // Create client services.
    this._clientServices = await fromHost(this._options.config, { lockKey: lockFilePath(this._options.profile) });
    await this._clientServices.open(new Context());

    // Create client.
    // TODO(burdon): Move away from needing client for epochs and proxy?
    this._client = new Client({ config: this._options.config, services: this._clientServices });
    await this._client.initialize();

    // Global hook for debuggers.
    ((globalThis as any).__DXOS__ ??= {}).host = (this._clientServices as any)._host;

    //
    // Unix socket (accessed via CLI).
    // TODO(burdon): Configure ClientServices plugin with multiple endpoints.
    //
    if (this._options.protocol?.socket) {
      const { path } = parseAddress(this._options.protocol.socket);
      mkdirSync(dirname(path), { recursive: true });
      rmSync(path, { force: true });
      const httpServer = http.createServer();
      httpServer.listen(path);
      const service = createServer(this._clientServices, { server: httpServer });
      await service.open();
      this._services.push(service);
    }

    //
    // Web socket (accessed via devtools).
    // TODO(burdon): Insecure.
    //
    if (this._options.protocol?.webSocket) {
      const service = createServer(this._clientServices, { port: this._options.protocol.webSocket });
      await service.open();
      this._services.push(service);
    }

    // Open plugins.
    for (const plugin of this._plugins) {
      await plugin.initialize(this._client!, this._clientServices!);
      await plugin.open();
      log('open', { plugin });
    }

    log('started...');
  }

  async stop() {
    log('stopping...');

    // Close plugins.
    await Promise.all(this._plugins.map((plugin) => plugin.close()));
    this._plugins.length = 0;

    // Close services.
    await Promise.all(this._services.map((plugin) => plugin.close()));
    this._services.length = 0;

    // Close client and services.
    await this._client?.destroy();
    await this._clientServices?.close(new Context());
    this._client = undefined;
    this._clientServices = undefined;

    ((globalThis as any).__DXOS__ ??= {}).host = undefined;
    log('stopped');
  }
}

const createServer = (clientServices: ClientServicesProvider, options: WebSocket.ServerOptions) => {
  return new WebsocketRpcServer<{}, ClientServices>({
    ...options,
    onConnection: async () => {
      let start = 0;
      const connection = PublicKey.random().toHex();
      return {
        exposed: clientServices.descriptors,
        handlers: clientServices.services as ClientServices,
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
