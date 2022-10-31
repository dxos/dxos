//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { ModelFactory } from '@dxos/model-factory';
import { MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { createStorage, Storage, StorageType } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';

import { ServiceContext } from './service-context';

// TODO(burdon): Split out tests.
describe('ServiceContext', function () {
  // TODO(burdon): Create test builder.
  const createServiceContext = async ({
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
    const serviceContext = new ServiceContext(storage, networkManager, modelFactory);
    await serviceContext.open();

    return serviceContext;
  };

  describe('Halo invitations', function () {
    it('creates identity', async function () {
      const peer = await createServiceContext();
      afterTest(() => peer.close());

      const identity = await peer.createIdentity();
      expect(identity).not.to.be.undefined;
    });

    it('device invitations', async function () {
      const signalContext = new MemorySignalManagerContext();

      const peer1 = await createServiceContext({ signalContext });
      const peer2 = await createServiceContext({ signalContext });
      afterTest(() => peer1.close());
      afterTest(() => peer2.close());

      const identity1 = await peer1.createIdentity();
      expect(peer1.identityManager.identity).to.eq(identity1);
      expect(peer2.identityManager.identity).to.be.undefined;

      const invitation = await peer1.haloInvitations.createInvitation();
      const identity2 = await peer2.haloInvitations.acceptInvitation(invitation);
      expect(identity2.identityKey).to.deep.eq(identity1.identityKey);
    });
  });

  describe('Space invitations', function () {
    it('space genesis', async function () {
      const serviceContext = await createServiceContext();
      afterTest(() => serviceContext.close());

      await serviceContext.createIdentity();

      const space = await serviceContext.spaceManager!.createSpace();
      expect(space.database).not.to.be.undefined;
      expect(serviceContext.spaceManager!.spaces.has(space.key)).to.be.true;
      await space.close();
    });

    it('space genesis with database', async function () {
      const serviceContext = await createServiceContext();
      afterTest(() => serviceContext.close());

      await serviceContext.createIdentity();
      const space = await serviceContext.spaceManager!.createSpace();

      {
        const item = await space.database!.createItem<ObjectModel>({ type: 'test' });
        void item.model.set('name', 'test');
      }

      {
        const [item] = space.database!.select({ type: 'test' }).exec().entities;
        expect(item.model.get('name')).to.eq('test');
      }

      await space.close();
    });

    it('create and accepts space invitations', async function () {
      const signalContext = new MemorySignalManagerContext();

      const peer1 = await createServiceContext({ signalContext });
      const peer2 = await createServiceContext({ signalContext });
      afterTest(() => peer1.close());
      afterTest(() => peer2.close());

      await peer1.createIdentity();
      await peer2.createIdentity();

      const space1 = await peer1.spaceManager!.createSpace();
      const invitation = await peer1.createInvitation(space1.key);

      const space2 = await peer2.acceptInvitation(invitation);
      expect(space1.key).to.deep.eq(space2.key);

      // TODO(burdon): Write multiple items.

      {
        // Check item replicated from 1 => 2.
        const item1 = await space1.database!.createItem({ type: 'dxos.example.1' });
        const item2 = await space2.database!.waitForItem({ type: 'dxos.example.1' });
        expect(item1.id).to.eq(item2.id);
      }

      {
        // Check item replicated from 2 => 1.
        const item1 = await space2.database!.createItem({ type: 'dxos.example.2' });
        const item2 = await space1.database!.waitForItem({ type: 'dxos.example.2' });
        expect(item1.id).to.eq(item2.id);
      }

      await space1.close();
      await space2.close();
    });
  });
});
