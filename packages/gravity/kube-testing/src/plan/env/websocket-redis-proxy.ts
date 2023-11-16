//
// Copyright 2023 DXOS.org
//

import type WebSocket from 'isomorphic-ws';
import { createConnection, type NetConnectOpts } from 'node:net';
import { type Duplex } from 'node:stream';
import { createServer, type Server, type WebSocketDuplex } from 'websocket-stream';

import { runInContext } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';

import { REDIS_PORT } from './agent-env';

export type WebSocketRedisProxyParams = {
  /**
   * ioredis uses `family = 4` by default.
   */
  redisTCPConnection?: NetConnectOpts;
  websocketServer?: WebSocket.ServerOptions;
};

export const DEFAULT_WEBSOCKET: WebSocket.ServerOptions = {
  host: 'localhost',
  port: 8080,
};

export const DEFAULT_WEBSOCKET_ADDRESS = `ws://${DEFAULT_WEBSOCKET.host}:${DEFAULT_WEBSOCKET.port}`;

export const DEFAULT_REDIS_TCP_CONNECTION: NetConnectOpts = {
  host: 'localhost',
  port: REDIS_PORT,
  family: 4,
};

export class WebSocketRedisProxy {
  private readonly _ctx = new Context();

  /**
   * WebSocket server to enable connection from playwright browser.
   */
  private readonly _wsServer: Server;

  /**
   * WebSocket connection to client in playwright browser.
   */
  private _ws?: WebSocketDuplex;

  constructor(private readonly _params?: WebSocketRedisProxyParams) {
    this._wsServer = createServer(this._params?.websocketServer ?? DEFAULT_WEBSOCKET);
    this._wsServer.on('stream', (ws) => {
      log.info('New WebSocket connection');
      ws.on('error', (err) => {
        log.error('REDIS proxy WebSocket connection error', { err });
      });

      /**
       * TCP stream to Redis server.
       */
      const stream = createConnection(this._params?.redisTCPConnection ?? DEFAULT_REDIS_TCP_CONNECTION);
      this._ctx.onDispose(() => {
        stream.destroy();
      });

      stream.once('ready', () => {
        log.info('TCP connection ready');
        runInContext(this._ctx, () => this._pipeStreams(ws, stream));
      });

      stream.on('error', (err) => {
        log.error('REDIS proxy TCP connection error', { err });
      });
    });
  }

  async destroy() {
    this._wsServer.close();
  }

  private _pipeStreams(first: Duplex, second: Duplex) {
    first.pipe(second).pipe(first);
    this._ctx.onDispose(() => {
      first.unpipe(second).unpipe(first);
    });
  }
}
