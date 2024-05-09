//
// Copyright 2024 DXOS.org
//

import { Resource } from '@dxos/context';
import { RpcPeer, type RpcPort } from '@dxos/rpc';

import { type ReplicantEnv } from '../interface';

export class ReplicantRpcServer extends Resource {
  private readonly _rpc: RpcPeer;

  constructor({ handler, port }: { handler: ReplicantEnv; port: RpcPort }) {
    super();
    this._rpc = new RpcPeer({
      callHandler: async (method, { value }) => {
        const args = JSON.parse(Buffer.from(value).toString());
        const response = await (handler as any)[method](...args);

        return {
          type_url: 'google.protobuf.Any',
          value: Buffer.from(JSON.stringify(response)),
        };
      },
      port,
    });
  }

  protected override async _open(): Promise<void> {
    await this._rpc.open();
  }

  protected override async _close(): Promise<void> {
    await this._rpc.close();
  }
}
