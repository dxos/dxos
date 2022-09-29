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
      const peer = await setup();
      await peer.open();
      afterTest(() => peer.close());

      const identity = await peer.createIdentity();
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

      const invitation = await peer1.haloInvitations.createInvitation();
      const identity2 = await peer2.haloInvitations.acceptInvitation(invitation);

      expect(identity2.identityKey).toEqual(identity1.identityKey);
    });
  });

  describe('Data spaces', () => {
    test('space genesis', async () => {
      const serviceContext = await setup();
      await serviceContext.open();
      afterTest(() => serviceContext.close());
      await serviceContext.createIdentity();

      const space = await serviceContext.spaceManager!.createSpace();
      expect(space.database).toBeTruthy();
      expect(serviceContext.spaceManager!.spaces.has(space.key)).toBeTruthy();
    });

    test('space genesis with database', async () => {
      const serviceContext = await setup();
      await serviceContext.open();
      afterTest(() => serviceContext.close());
      await serviceContext.createIdentity();

      const space = await serviceContext.spaceManager!.createSpace();

      {
        const item = await space.database!.createItem<ObjectModel>({ type: 'test' });
        void item.model.set('name', 'test');
      }

      {
        const [item] = space.database!.select({ type: 'test' }).exec().entities;
        expect(item.model.get('name')).toEqual('test');
      }
    });

    test('invitations', async () => {
      const signalContext = new MemorySignalManagerContext();

      const peer1 = await setup({ signalContext });
      await peer1.open();
      afterTest(() => peer1.close());
      await peer1.createIdentity();

      const peer2 = await setup({ signalContext });
      await peer2.open();
      afterTest(() => peer2.close());
      await peer2.createIdentity();

      const space1 = await peer1.spaceManager!.createSpace();
      const invitation = await peer1.createInvitation(space1.key);
      const space2 = await peer2.joinSpace(invitation);
      expect(space1.key).toEqual(space2.key);

      // TODO(burdon): Write multiple items.

      {
        // Check item replicated from 1 => 2.
        const item1 = await space1.database!.createItem({ type: 'dxos.example.1' });
        const item2 = await space2.database!.waitForItem({ type: 'dxos.example.1' });
        expect(item1.id).toEqual(item2.id);
      }

      {
        // Check item replicated from 2 => 1.
        const item1 = await space2.database!.createItem({ type: 'dxos.example.2' });
        const item2 = await space1.database!.waitForItem({ type: 'dxos.example.2' });
        expect(item1.id).toEqual(item2.id);
      }
    });
  });
});
