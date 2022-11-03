//
// Copyright 2022 DXOS.org
//

import * as rpc from '@dxos/rpc';

import { RpcPort } from './rpc-port';

// This test will break at compile time if the interface changes.
it('RpcPort type is assignable to type from @dxos/rpc package', function () {
  {
    const _port: RpcPort = {} as rpc.RpcPort;
  }
  {
    const _port: rpc.RpcPort = {} as RpcPort;
  }
});
