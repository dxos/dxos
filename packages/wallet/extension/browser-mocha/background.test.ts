//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import { createWindowMessagePort, useBackgroundService, schema, BackgroundService } from '@dxos/wallet-core';
import { RpcPort, ProtoRpcClient, createRpcClient } from '@dxos/rpc';
import faker from 'faker';


describe('Background service tested through the content script', () => {
  let rpcClient: ProtoRpcClient<BackgroundService>

  before(async () => {
    const port = createWindowMessagePort()
    const service = schema.getService('dxos.wallet.extension.BackgroundService')
    rpcClient = createRpcClient(service, {port})
  
    await rpcClient.open()
  })

  it('Retrieves empty profile at first', async () => {
    const profile = await rpcClient.rpc.GetProfile({});
    expect(profile.publicKey).toBeUndefined();
    expect(profile.username).toBeUndefined();
  });
  
  it('Can create a profile', async () => {
    const username = faker.name.firstName();
    await rpcClient.rpc.CreateProfile({username})
    const profile = await rpcClient.rpc.GetProfile({})
    expect(profile.username).toEqual(username)
    expect(profile.publicKey).toBeDefined();
  });

  after(async () => {
    await rpcClient.close();
  })
})
