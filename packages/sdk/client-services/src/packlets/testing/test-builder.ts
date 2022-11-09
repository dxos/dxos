//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { Config } from '@dxos/config';
import { Space } from '@dxos/echo-db';
import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import { createStorage, Storage, StorageType } from '@dxos/random-access-storage';

import { createDefaultModelFactory, ClientServicesHost, ServiceContext } from '../services';

//
// TODO(burdon): Replace with test builder.
//

export const createServiceHost = (config: Config, signalManagerContext: MemorySignalManagerContext) => {
  const networkManager = new NetworkManager({
    signalManager: new MemorySignalManager(signalManagerContext),
    transportFactory: MemoryTransportFactory
  });

  return new ClientServicesHost({
    config,
    networkManager
  });
};

export const createServiceContext = ({
  signalContext = new MemorySignalManagerContext(),
  storage = createStorage({ type: StorageType.RAM })
}: {
  signalContext?: MemorySignalManagerContext;
  storage?: Storage;
} = {}) => {
  const networkManager = new NetworkManager({
    signalManager: new MemorySignalManager(signalContext),
    transportFactory: MemoryTransportFactory
  });

  const modelFactory = createDefaultModelFactory();
  return new ServiceContext(storage, networkManager, modelFactory);
};

export const createPeers = async (numPeers: number) => {
  const signalContext = new MemorySignalManagerContext();

  return await Promise.all(
    Array.from(Array(numPeers)).map(async () => {
      const peer = createServiceContext({ signalContext });
      await peer.open();
      return peer;
    })
  );
};

export const createIdentity = async (peer: ServiceContext) => {
  await peer.createIdentity();
  return peer;
};

// TODO(burdon): Make configurable (multiple items).
export const syncItems = async (space1: Space, space2: Space) => {
  {
    // Check item replicated from 1 => 2.
    const item1 = await space1.database!.createItem({ type: 'type-1' });
    const item2 = await space2.database!.waitForItem({ type: 'type-1' });
    expect(item1.id).to.eq(item2.id);
  }

  {
    // Check item replicated from 2 => 1.
    const item1 = await space2.database!.createItem({ type: 'type-2' });
    const item2 = await space1.database!.waitForItem({ type: 'type-2' });
    expect(item1.id).to.eq(item2.id);
  }
};
