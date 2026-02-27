//
// Copyright 2021 DXOS.org
//

import { Event } from '@dxos/async';
import { type MessageTrace, MessageTrace_Direction, MessageTraceSchema } from '@dxos/protocols/buf/dxos/rpc_pb';
import { create } from '@dxos/protocols/buf';

import { type RpcPort } from './rpc';

export class PortTracer {
  readonly message = new Event<MessageTrace>();

  private readonly _port: RpcPort;

  constructor(private readonly _wrappedPort: RpcPort) {
    this._port = {
      send: (msg: Uint8Array) => {
        this.message.emit(
          create(MessageTraceSchema, {
            direction: MessageTrace_Direction.OUTGOING,
            data: msg,
          }),
        );

        return this._wrappedPort.send(msg);
      },
      subscribe: (cb: (msg: Uint8Array) => void) => {
        return this._wrappedPort.subscribe((msg) => {
          this.message.emit(
            create(MessageTraceSchema, {
              direction: MessageTrace_Direction.INCOMING,
              data: msg,
            }),
          );
          cb(msg);
        });
      },
    };
  }

  public get port() {
    return this._port;
  }
}
