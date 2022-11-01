//
// Copyright 2022 DXOS.org
//

import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { ModelFactory } from '@dxos/model-factory';
import { MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { createStorage, Storage, StorageType } from '@dxos/random-access-storage';

import { ServiceContext } from '../service-context';

// TODO(burdon): Create test builder.
export const createServiceContext = async ({
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

  const modelFactory = new ModelFactory().registerModel(ObjectModel);
  return new ServiceContext(storage, networkManager, modelFactory);
};

// TODO(burdon): Create test builder.
export const createPeers = async (numPeers: number) => {
  const signalContext = new MemorySignalManagerContext();

  return await Promise.all(
    Array.from(Array(numPeers)).map(async () => {
      const peer = await createServiceContext({ signalContext });
      await peer.open();
      return peer;
    })
  );
};
