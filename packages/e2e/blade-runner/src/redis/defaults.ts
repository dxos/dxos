//
// Copyright 2024 DXOS.org
//

import { type NetConnectOpts } from 'node:net';

import type WebSocket from 'isomorphic-ws';

import { isNode } from '@dxos/util';

import { type RedisOptions } from '../env';

import { WebSocketConnector } from './websocket-connector';

export const REDIS_PORT = 6379;

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

export const DEFAULT_REDIS_OPTIONS: RedisOptions = !isNode()
  ? ({ Connector: WebSocketConnector, address: DEFAULT_WEBSOCKET_ADDRESS } as RedisOptions)
  : { port: REDIS_PORT };
