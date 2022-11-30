//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { MemorySignalManagerContext, MemorySignalManager } from '@dxos/messaging';
import { MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import { describe, test } from '@dxos/test';

import { BotFactoryClient } from './client';

describe('In-Memory', () => {
  test('Can be initialized', async () => {
    const networkManager = new NetworkManager({
      signalManager: new MemorySignalManager(new MemorySignalManagerContext()),
      transportFactory: MemoryTransportFactory
    });

    const client = new BotFactoryClient(networkManager);
    expect(client).toBeDefined();
  });
});
