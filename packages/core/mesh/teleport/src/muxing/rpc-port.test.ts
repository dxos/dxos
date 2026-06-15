//
// Copyright 2022 DXOS.org
//

import { test } from 'vitest';

import type * as rpc from '@dxos/rpc';

import { type RpcPort } from './rpc-port';

// This test will break at compile time if the interface changes.
test('RpcPort type is assignable to type from @dxos/rpc package', () => {
  {
    const _port: RpcPort = {} as rpc.RpcPort;
  }
  {
    const _port: rpc.RpcPort = {} as RpcPort;
  }
});
