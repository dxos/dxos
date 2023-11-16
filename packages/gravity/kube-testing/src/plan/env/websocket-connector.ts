//
// Copyright 2023 DXOS.org
//

import { AbstractConnector, type RedisOptions } from 'ioredis';
import { type ErrorEmitter } from 'ioredis/built/connectors/AbstractConnector';
import { type NetStream } from 'ioredis/built/types';
import { Socket } from 'node:net';
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
    const stream = WebSocketStream(this.options.address);

    // NOTE: Used only to check fields in proxy below.
    const instanceOfSocket = new Socket();

    const proxy = new Proxy<Socket>(stream as unknown as Socket, {
      get(target, prop, receiver) {
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }

        // Check if the property exists in class A
        if (prop in instanceOfSocket) {
          const member = (instanceOfSocket as any)[prop];
          // If it's a function, return a noop function
          if (typeof member === 'function') {
            return () => {};
          }
          // If it's a field, return null
          return null;
        }

        // If the property does not exist in class A, return undefined
        return undefined;
      },
    });
    return proxy;
  }
}
