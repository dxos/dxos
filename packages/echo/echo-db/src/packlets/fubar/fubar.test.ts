//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { NetworkManager } from '@dxos/network-manager';
import { createStorage, Storage, StorageType } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';

import { Fubar } from './fubar';
import { ObjectModel } from '@dxos/object-model';

describe('fubar/fubar', () => {
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

    const fubar = new Fubar(
      storage,
      networkManager
    );

    return fubar;
  };

  describe('Identity management', () => {
    test('creates identity', async () => {
      const fubar = await setup();
      await fubar.open();
      afterTest(() => fubar.close());

      const identity = await fubar.createIdentity();
      expect(identity).toBeTruthy();
    });

    test('device invitations', async () => {
      const signalContext = new MemorySignalManagerContext()

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
    })
  })

  describe('Data spaces', () => {
    test('space genesis', async () => {
      const fubar = await setup();
      await fubar.open();
      afterTest(() => fubar.close());
      await fubar.createIdentity();

      const space = await fubar.brane!.createSpace();
      expect(space.database).toBeTruthy();
      expect(fubar.brane!.spaces.has(space.key)).toBeTruthy();
    })

    test('space genesis with database', async () => {
      const fubar = await setup();
      await fubar.open();
      afterTest(() => fubar.close());
      await fubar.createIdentity();

      const space = await fubar.brane!.createSpace();

      {
        const item = await space.database!.createItem<ObjectModel>({ type: 'test' });
        item.model.set('name', 'test');
      }

      {
        const [item] = space.database!.select({ type: 'test' }).exec().entities;
        expect(item.model.get('name')).toEqual('test');
      }
    })
  })

});

