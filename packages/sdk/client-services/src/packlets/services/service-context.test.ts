//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { ModelFactory } from '@dxos/model-factory';
import { MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { createStorage, Storage, StorageType } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';

import { ServiceContext } from './service-context';

describe('ServiceContext', function () {
  const setupPeer = async ({
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

    return new ServiceContext(storage, networkManager, new ModelFactory().registerModel(ObjectModel));
  };

  describe('Identity management', function () {
    it('creates identity', async function () {
      const peer = await setupPeer();
      await peer.open();
      afterTest(() => peer.close());

      const identity = await peer.createIdentity();
      expect(identity).toBeTruthy();
    });

    it('device invitations', async function () {
      const signalContext = new MemorySignalManagerContext();

      const peer1 = await setupPeer({ signalContext });
      await peer1.open();
      afterTest(() => peer1.close());
      const identity1 = await peer1.createIdentity();
      expect(identity1).toBeTruthy();

      const peer2 = await setupPeer({ signalContext });
      await peer2.open();
      afterTest(() => peer2.close());

      expect(peer2.identityManager.identity).toBeFalsy();

      const invitation = await peer1.haloInvitations.createInvitation();
      const identity2 = await peer2.haloInvitations.acceptInvitation(invitation);

      expect(identity2.identityKey).toEqual(identity1.identityKey);
    });
  });

  describe('Data spaces', function () {
    it('space genesis', async function () {
      const serviceContext = await setupPeer();
      await serviceContext.open();
      afterTest(() => serviceContext.close());

      await serviceContext.createIdentity();

      const space = await serviceContext.spaceManager!.createSpace();
      expect(space.database).toBeTruthy();
      expect(serviceContext.spaceManager!.spaces.has(space.key)).toBeTruthy();
      await space.close();
    });

    it('space genesis with database', async function () {
      const serviceContext = await setupPeer();
      await serviceContext.open();
      afterTest(() => serviceContext.close());

      await serviceContext.createIdentity();

      const space = await serviceContext.spaceManager!.createSpace();

      {
        const item = await space.database!.createItem<ObjectModel>({
          type: 'test'
        });
        void item.model.set('name', 'test');
      }

      {
        const [item] = space.database!.select({ type: 'test' }).exec().entities;
        expect(item.model.get('name')).toEqual('test');
      }

      await space.close();
    });

    it('create and accepts space invitations', async function () {
      const signalContext = new MemorySignalManagerContext();

      const peer1 = await setupPeer({ signalContext });
      await peer1.open();
      afterTest(() => peer1.close());
      await peer1.createIdentity();

      const peer2 = await setupPeer({ signalContext });
      await peer2.open();
      afterTest(() => peer2.close());
      await peer2.createIdentity();

      const space1 = await peer1.spaceManager!.createSpace();
      const invitation = await peer1.createInvitation(space1.key);
      const space2 = await peer2.acceptInvitation(invitation);
      expect(space1.key).toEqual(space2.key);

      // TODO(burdon): Write multiple items.

      {
        // Check item replicated from 1 => 2.
        const item1 = await space1.database!.createItem({
          type: 'dxos.example.1'
        });
        const item2 = await space2.database!.waitForItem({
          type: 'dxos.example.1'
        });
        expect(item1.id).toEqual(item2.id);
      }

      {
        // Check item replicated from 2 => 1.
        const item1 = await space2.database!.createItem({
          type: 'dxos.example.2'
        });
        const item2 = await space1.database!.waitForItem({
          type: 'dxos.example.2'
        });
        expect(item1.id).toEqual(item2.id);
      }

      await space1.close();
      await space2.close();
    });
  });
});
