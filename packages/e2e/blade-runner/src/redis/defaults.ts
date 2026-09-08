//
// Copyright 2024 DXOS.org
//

import type WebSocket from 'isomorphic-ws';
import { type NetConnectOpts } from 'node:net';

import { isNode } from '@dxos/util';

import { type RedisOptions } from '../env';
import { WebSocketConnector } from './websocket-connector';

/**
 * Overridable so CI can point the orchestrator at a service container, which is reachable by
 * service name rather than on loopback. Absent, the local `redis-server` a developer runs.
 */
export const REDIS_HOST = process.env.DX_REDIS_HOST ?? 'localhost';
export const REDIS_PORT = Number(process.env.DX_REDIS_PORT ?? 6379);

export const DEFAULT_WEBSOCKET: WebSocket.ServerOptions = {
  host: 'localhost',
  port: 8080,
};

export const DEFAULT_WEBSOCKET_ADDRESS = `ws://${DEFAULT_WEBSOCKET.host}:${DEFAULT_WEBSOCKET.port}`;

export const DEFAULT_REDIS_TCP_CONNECTION: NetConnectOpts = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  family: 4,
};

export const DEFAULT_REDIS_OPTIONS: RedisOptions = !isNode()
  ? ({ Connector: WebSocketConnector, address: DEFAULT_WEBSOCKET_ADDRESS } as RedisOptions)
  : { host: REDIS_HOST, port: REDIS_PORT };
