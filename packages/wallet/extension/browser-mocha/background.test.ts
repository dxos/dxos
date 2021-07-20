//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import { createWindowMessagePort, useBackgroundService, schema } from '@dxos/wallet-core';
import { RpcPort, ProtoRpcClient, createRpcClient } from '@dxos/rpc';

it('Connects to the background service through the content script', async () => {
  expect(2 + 2).toEqual(4);

  const port = createWindowMessagePort()
  const service = schema.getService('dxos.wallet.extension.BackgroundService')
  const rpcClient = createRpcClient(service, {port})

  await rpcClient.open()
});
