//
// Copyright 2024 DXOS.org
//

import { Resource } from '@dxos/context';
import { RpcPeer, type RpcPort } from '@dxos/rpc';

import { type ReplicantBrain } from '../interface';

export class ReplicantRpcHandle<T> extends Resource {
  private readonly _rpc: RpcPeer;

  constructor({ brain, rpcPort }: { brain: ReplicantBrain<T>; rpcPort: RpcPort }) {
    super();
    this._rpc = new RpcPeer({
      callHandler: async () => {
        throw new Error('Method not implemented');
      },
      noHandshake: true,
      port: rpcPort,
    });

    for (const method of Object.getOwnPropertyNames(brain.prototype)) {
      if (method === 'constructor') {
        continue;
      }
      Object.defineProperty(this, method, {
        value: async (...args: any[]) => {
          await this._rpc.call(method, {
            type_url: 'google.protobuf.Any',
            value: Buffer.from(JSON.stringify(args)),
          });
        },
      });
    }
  }

  override async _open(): Promise<void> {
    await this._rpc.open();
  }

  override async _close(): Promise<void> {
    await this._rpc.close();
  }
}
