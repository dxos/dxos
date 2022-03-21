//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { NetworkManager } from '@dxos/network-manager';

import { BotFactoryClient } from './client';

describe('In-Memory', () => {
  it('Can be initialized', async () => {
    const networkManager = new NetworkManager();
    const client = new BotFactoryClient(networkManager);
    expect(client).toBeDefined();
  });
});
