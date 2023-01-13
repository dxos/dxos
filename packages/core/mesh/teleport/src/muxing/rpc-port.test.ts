//
// Copyright 2022 DXOS.org
//

import * as rpc from '@dxos/rpc';
import { test } from '@dxos/test';

import { RpcPort } from './rpc-port';

// This test will break at compile time if the interface changes.
test('RpcPort type is assignable to type from @dxos/rpc package', () => {
  {
    const _port: RpcPort = {} as rpc.RpcPort;
  }
  {
    const _port: rpc.RpcPort = {} as RpcPort;
  }
});
