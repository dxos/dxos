//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { createMemorySignalManagerContext, MemorySignalManager } from '@dxos/messaging';
import { NetworkManager } from '@dxos/network-manager';

import { BotFactoryClient } from './client';

describe('In-Memory', () => {
  it('Can be initialized', async () => {
    const networkManager = new NetworkManager({
      signalManager: new MemorySignalManager(createMemorySignalManagerContext())
    });
    const client = new BotFactoryClient(networkManager);
    expect(client).toBeDefined();
  });
});
