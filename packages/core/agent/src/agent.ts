//
// Copyright 2023 DXOS.org
//

import type WebSocket from 'isomorphic-ws';
import { mkdirSync, rmSync } from 'node:fs';
import * as http from 'node:http';
import { type Socket } from 'node:net';
import { dirname } from 'node:path';

import { Trigger } from '@dxos/async';
import { type Config, Client, PublicKey } from '@dxos/client';
import { type ClientServices, type ClientServicesProvider, fromHost } from '@dxos/client/services';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import {
  createLibDataChannelTransportFactory,
  createSimplePeerTransportFactory,
  type TransportFactory,
} from '@dxos/network-manager';
import { SystemStatus } from '@dxos/protocols/proto/dxos/client/services';
import { tracer } from '@dxos/util';
import { WebsocketRpcServer, authenticateRequestWithTokenAuth } from '@dxos/websocket-rpc';

import { getPluginConfig, type Plugin } from './plugins';
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
    socketPath: string;
    webSocket?: number;
    http?: AgentHttpParams;
  };
};

export type AgentHttpParams = { port: number; authenticationToken: string; wsAuthenticationToken: string };

/**
 * The remote agent exposes Client services via multiple transports.
 */
export class Agent {
  private readonly _plugins: Plugin[];

  private _client?: Client;
  private _clientServices?: ClientServicesProvider;
  private _services: Service[] = [];
  private _httpServers: http.Server[] = [];

  constructor(private readonly _options: AgentOptions) {
    invariant(this._options);
    this._plugins = this._options.plugins?.filter(Boolean) ?? [];
    if (this._options.metrics) {
      tracer.start();
    }
  }

  get client() {
    return this._client;
  }

  get clientServices() {
    return this._clientServices;
  }

  async start() {
    invariant(!this._clientServices);
    log('starting...');

    // TODO(nf): move to config
    let transportFactory: TransportFactory;
    // TODO(burdon): Change to DX_WEBRTCLIB for consistency and easier discovery.
    if (process.env.WEBRTCLIBRARY === 'SimplePeer') {
      log.info('using SimplePeer');
      transportFactory = createSimplePeerTransportFactory({
        iceServers: this._options.config.get('runtime.services.ice'),
      });
    } else {
      log.info('using LibDataChannel');
      transportFactory = createLibDataChannelTransportFactory({
        iceServers: this._options.config.get('runtime.services.ice'),
      });
    }

    // Create client services.
    // TODO(nf): set observability group.
    // TODO(nf): honor kill switch.
    this._clientServices = await fromHost(this._options.config, {
      lockKey: lockFilePath(this._options.profile),
      transportFactory,
    });
    await this._clientServices.open(new Context());

    // Create client.
    // TODO(burdon): Move away from needing client for epochs and proxy?
    this._client = new Client({ config: this._options.config, services: this._clientServices });
    await this._client.initialize();

    //
    // Unix socket (accessed via CLI).
    // TODO(burdon): Configure ClientServices plugin with multiple endpoints.
    //
    if (this._options.protocol?.socketPath) {
      const { path } = parseAddress(this._options.protocol.socketPath);
      mkdirSync(dirname(path), { recursive: true });
      rmSync(path, { force: true });
      const unixSocketServer = http.createServer();
      unixSocketServer.listen(path);
      const socketServer = createServer(this._clientServices, { server: unixSocketServer });
      await socketServer.open();
      this._services.push(socketServer);
      this._httpServers.push(unixSocketServer);
      log.info('listening', { path });
    }

    //
    // Web socket (accessed via devtools).
    // TODO(burdon): Insecure.
    //
    if (this._options.protocol?.webSocket) {
      const port = this._options.protocol.webSocket;

      const websocketServer = http.createServer();
      websocketServer.listen(port);

      const socketServer = createServer(this._clientServices, { server: websocketServer });
      await socketServer.open();
      this._services.push(socketServer);
      this._httpServers.push(websocketServer);
      log.info('listening', { port });
    }

    // TODO(nf): move this, and all other listeners to agent CLI?
    if (this._options.protocol?.http) {
      await this.createHttpServer(this._options.protocol.http);
    }

    // Open plugins.
    // TODO(burdon): Spawn new process for each plugin?
    for (const plugin of this._plugins) {
      const config = getPluginConfig(this._client.config, plugin.id);
      if (config) {
        await plugin.initialize({
          client: this._client!,
          clientServices: this._clientServices!,
          plugins: this._plugins,
        });

        await plugin.open();
        log.info('open', { plugin: plugin.id });
      }
    }

    log('started');
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
    await Promise.all(
      this._httpServers.map(async (server) => {
        const httpServerClosed = new Trigger();
        server.close(() => httpServerClosed.wake());
        await httpServerClosed.wait({ timeout: 5_000 });
      }),
    );
    log('stopped');
  }

  // create multipurpose HTTP server to expose agent functionality to external clients.
  // TODO: extract to separate class, e.g. extend WebsocketRpcServer?
  async createHttpServer(options: agentHttpServerOptions) {
    invariant(this._clientServices);
    const server = http.createServer();
    const socketServer = createServer(this._clientServices, { noServer: true });
    await socketServer.open();

    server.listen(options.port);

    server.on('upgrade', (request, socket: Socket, head) => {
      authenticateRequestWithTokenAuth(request, socket, head, options.wsAuthenticationToken, (request, socket, head) =>
        socketServer.handleUpgrade(request, socket, head),
      );
    });
    server.on('error', (err) => {
      log('HTTP server error', { err });
    });
    server.on('request', (request, response) => {
      if (request.headers.authorization !== options.authenticationToken) {
        log('unauthorized', { authorization: request.headers.authorization, foo: options.authenticationToken });
        response.writeHead(401);
        response.end('Unauthorized');
        return;
      }

      const reqUrl = request.url;
      // TODO(nf): '/.well-known' URL?
      if (reqUrl === '/status') {
        handleStatus(request, response, this._client);
      } else {
        response.writeHead(404);
        response.end('Not found');
      }
    });
    server.on('listening', () => {
      log.info('HTTP server listening', { port: options.port });
    });

    this._services.push(socketServer);
    this._httpServers.push(server);
  }
}

// create dedicated WS server for internal, unauthenticated access to ClientServices.
// TODO: default listening on localhost to avoid accidental exposure.
const createServer = (clientServices: ClientServicesProvider, options: WebSocket.ServerOptions) => {
  return new WebsocketRpcServer<{}, ClientServices>({
    ...options,
    onConnection: async () => {
      let start = 0;
      const connection = PublicKey.random().toHex().slice(0, 8);
      return {
        exposed: clientServices.descriptors,
        handlers: clientServices.services as ClientServices,
        // Called when client connects.
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

export type agentHttpServerOptions = {
  port: number;
  authenticationToken: string;
  wsAuthenticationToken: string;
};

// TODO: extend and better assess health?
const handleStatus = (request: http.IncomingMessage, response: http.ServerResponse, client?: Client) => {
  if (!client) {
    response.writeHead(503);
    response.end('Client not available');
    return;
  }
  const status = client.status.get();
  if (status === SystemStatus.ACTIVE) {
    response.writeHead(200);
    response.end('SystemStatus is active');
  } else {
    response.writeHead(503);
    response.end('SystemStatus is not active');
  }
};
