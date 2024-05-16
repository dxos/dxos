//
// Copyright 2024 DXOS.org
//

import { Resource } from '@dxos/context';
import { RpcPeer, type RpcPort } from '@dxos/rpc';

import { rpcCodec } from './util';

export type ReplicantRpcServerParams = {
  /**
   *  Instance of the replicant.
   */
  handler: any;
  port: RpcPort;
};

/**
 * Server for a replicant RPC.
 * Is created in replicant process.
 */
export class ReplicantRpcServer extends Resource {
  private readonly _rpc: RpcPeer;

  constructor({ handler, port }: ReplicantRpcServerParams) {
    super();
    this._rpc = new RpcPeer({
      callHandler: async (method, payload) => {
        const args = rpcCodec.decode(payload);
        const response = await (handler as any)[method](...args);

        return rpcCodec.encode(response);
      },
      port,
    });
  }

  protected override async _open(): Promise<void> {
    await this._rpc.open();
  }

  protected override async _close(): Promise<void> {
    await this._rpc.abort();
  }
}
