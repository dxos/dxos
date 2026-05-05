//
// Copyright 2021 DXOS.org
//

import { Event } from '@dxos/async';

import { type RpcPort } from './rpc';
// Sourced from the static, bufbuild-backed codec re-export — avoids pulling in the
// protobufjs reflection schema that ships with `@dxos/protocols/proto/dxos/rpc`.
import { type MessageTrace, MessageTrace_Direction } from './rpc-message-codec';

export { type MessageTrace, MessageTrace_Direction };

export class PortTracer {
  readonly message = new Event<MessageTrace>();

  private readonly _port: RpcPort;

  constructor(private readonly _wrappedPort: RpcPort) {
    this._port = {
      send: (msg: Uint8Array) => {
        this.message.emit({
          $typeName: 'dxos.rpc.MessageTrace',
          direction: MessageTrace_Direction.OUTGOING,
          data: msg,
        });

        return this._wrappedPort.send(msg);
      },
      subscribe: (cb: (msg: Uint8Array) => void) => {
        return this._wrappedPort.subscribe((msg) => {
          this.message.emit({
            $typeName: 'dxos.rpc.MessageTrace',
            direction: MessageTrace_Direction.INCOMING,
            data: msg,
          });
          cb(msg);
        });
      },
    };
  }

  public get port() {
    return this._port;
  }
}
