//
// Copyright 2024 DXOS.org
//

import { RpcPeer, type RpcPort } from '@dxos/rpc';

import { rpcCodec } from './util';
import { type ReplicantBrain } from '../interface';

export const open = Symbol('open');
export const close = Symbol('close');

const RPC_TIMEOUT = 120_000;

/**
 * Client for a replicant RPC.
 * Is created in orchestrator process.
 */
export class ReplicantRpcHandle<T> {
  private readonly _rpc: RpcPeer;

  constructor({ brain, rpcPort }: { brain: ReplicantBrain<T>; rpcPort: RpcPort }) {
    this._rpc = new RpcPeer({
      callHandler: async () => {
        throw new Error('Method not implemented');
      },
      noHandshake: true,
      port: rpcPort,
    });

    for (const method of Object.getOwnPropertyNames(brain.prototype)) {
      if (method === 'constructor' || method.startsWith('_')) {
        continue;
      }
      Object.defineProperty(this, method, {
        value: async (...args: any[]) => {
          return rpcCodec.decode(await this._rpc.call(method, rpcCodec.encode(args), { timeout: RPC_TIMEOUT }));
        },
      });
    }
  }

  [open] = async () => {
    await this._rpc.open();
  };

  [close] = async () => {
    await this._rpc.abort();
  };
}
