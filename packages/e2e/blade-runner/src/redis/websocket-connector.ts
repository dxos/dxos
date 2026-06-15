//
// Copyright 2023 DXOS.org
//

import { AbstractConnector, type RedisOptions } from 'ioredis';
import { type ErrorEmitter } from 'ioredis/built/connectors/AbstractConnector';
import { type NetStream } from 'ioredis/built/types';
import WebSocketStream from 'websocket-stream';

export type WebSocketConnectorOptions = RedisOptions & {
  /**
   * WebSocket address to connect to.
   */
  address: string;
};

export class WebSocketConnector extends AbstractConnector {
  constructor(protected options: WebSocketConnectorOptions) {
    super(options.disconnectTimeout!);
  }

  override async connect(_: ErrorEmitter): Promise<NetStream> {
    const stream: any = WebSocketStream(this.options.address);
    stream.setNoDelay = () => {};
    stream.setKeepAlive = () => {};
    return stream;
  }
}
