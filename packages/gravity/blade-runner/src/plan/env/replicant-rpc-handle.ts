//
// Copyright 2024 DXOS.org
//

import { RpcPeer, type RpcPort } from '@dxos/rpc';

import { rpcCodec } from './util';
import { type ReplicantClass } from '../interface';

export const open = Symbol('open');
export const close = Symbol('close');

export type ReplicantRpcHandleParams<T> = { replicantClass: ReplicantClass<T>; rpcPort: RpcPort };

/**
 * Client for a replicant RPC.
 * Is created in orchestrator process.
 */
export class ReplicantRpcHandle<T> {
  private readonly _rpc: RpcPeer;

  constructor({ replicantClass, rpcPort }: ReplicantRpcHandleParams<T>) {
    this._rpc = new RpcPeer({
      callHandler: async () => {
        throw new Error('Method not implemented');
      },
      noHandshake: true,
      port: rpcPort,
      timeout: 0,
    });

    for (const method of Object.getOwnPropertyNames(replicantClass.prototype)) {
      if (method === 'constructor' || method.startsWith('_')) {
        continue;
      }
      Object.defineProperty(this, method, {
        value: async (...args: any[]) => {
          return rpcCodec.decode(await this._rpc.call(method, rpcCodec.encode(args)));
        },
      });
    }
  }

  // NOTE: Used symbols here to not overlap with methods from `replicantClass`
  [open] = async () => {
    await this._rpc.open();
  };

  [close] = async () => {
    await this._rpc.abort();
  };
}
