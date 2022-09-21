//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { createStorage, Storage, StorageType } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';

import { ServiceContext } from './service-context';

describe('ServiceContext', () => {
  const setup = async ({
    signalContext = new MemorySignalManagerContext(),
    storage = createStorage({ type: StorageType.RAM })
  }: {
    signalContext?: MemorySignalManagerContext
    storage?: Storage
  } = {}) => {
    const networkManager = new NetworkManager({
      signalManager: new MemorySignalManager(signalContext)
    });

    return new ServiceContext(
      storage,
      networkManager
    );
  };

  describe('Identity management', () => {
    test('creates identity', async () => {
      const serviceContext = await setup();
      await serviceContext.open();
      afterTest(() => serviceContext.close());

      const identity = await serviceContext.createIdentity();
      expect(identity).toBeTruthy();
    });

    test('device invitations', async () => {
      const signalContext = new MemorySignalManagerContext();

      const peer1 = await setup({ signalContext });
      await peer1.open();
      afterTest(() => peer1.close());

      const peer2 = await setup({ signalContext });
      await peer2.open();
      afterTest(() => peer2.close());

      const identity1 = await peer1.createIdentity();
      expect(identity1).toBeTruthy();

      const invitation = await peer1.createInvitation();
      const identity2 = await peer2.join(invitation);

      expect(identity2.identityKey).toEqual(identity1.identityKey);
    });
  });

  describe('Data spaces', () => {
    test('space genesis', async () => {
      const serviceContext = await setup();
      await serviceContext.open();
      afterTest(() => serviceContext.close());
      await serviceContext.createIdentity();

      const space = await serviceContext.brane!.createSpace();
      expect(space.database).toBeTruthy();
      expect(serviceContext.brane!.spaces.has(space.key)).toBeTruthy();
    });

    test('space genesis with database', async () => {
      const serviceContext = await setup();
      await serviceContext.open();
      afterTest(() => serviceContext.close());
      await serviceContext.createIdentity();

      const space = await serviceContext.brane!.createSpace();

      {
        const item = await space.database!.createItem<ObjectModel>({ type: 'test' });
        item.model.set('name', 'test');
      }

      {
        const [item] = space.database!.select({ type: 'test' }).exec().entities;
        expect(item.model.get('name')).toEqual('test');
      }
    });
  });
});
