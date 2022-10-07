//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { MemorySignalManagerContext, MemorySignalManager } from '@dxos/messaging';
import { NetworkManager } from '@dxos/network-manager';

import { BotFactoryClient } from './client';

describe('In-Memory', function () {
  it('Can be initialized', async function () {
    const networkManager = new NetworkManager({
      signalManager: new MemorySignalManager(new MemorySignalManagerContext())
    });
    const client = new BotFactoryClient(networkManager);
    expect(client).toBeDefined();
  });
});
