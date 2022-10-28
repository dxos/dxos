//
// Copyright 2021 DXOS.org
//

import { Event } from '@dxos/async';
import { MessageTrace } from '@dxos/protocols/proto/dxos/rpc';

import { RpcPort } from './rpc';

export class PortTracer {
  readonly message = new Event<MessageTrace>();

  private readonly _port: RpcPort;

  // prettier-ignore
  constructor(
    private readonly _wrappedPort: RpcPort
  ) {
    this._port = {
      send: (msg: Uint8Array) => {
        this.message.emit({
          direction: MessageTrace.Direction.OUTGOING,
          data: msg
        });

        return this._wrappedPort.send(msg);
      },
      subscribe: (cb: (msg: Uint8Array) => void) => {
        return this._wrappedPort.subscribe((msg) => {
          this.message.emit({
            direction: MessageTrace.Direction.INCOMING,
            data: msg
          });
          cb(msg);
        });
      }
    };
  }

  public get port() {
    return this._port;
  }
}
