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

  test('creates identity', async () => {
    const fubar = await setup();
    await fubar.open();
    afterTest(() => fubar.close());

    const identity = await fubar.identityManager.createIdentity();
    expect(identity).toBeTruthy();
  });

  test('device invitations', async () => {
    const signalContext  = new MemorySignalManagerContext()

    const peer1 = await setup({ signalContext });
    await peer1.open();
    afterTest(() => peer1.close());

    const peer2 = await setup({ signalContext });
    await peer2.open();
    afterTest(() => peer2.close());

    const identity1 = await peer1.identityManager.createIdentity();
    expect(identity1).toBeTruthy();

    const invitation = await peer1.createInvitation();
    const identity2 = await peer2.join(invitation);

    expect(identity2.identityKey).toEqual(identity1.identityKey);
  })
});

