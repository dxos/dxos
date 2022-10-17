//
// Copyright 2022 DXOS.org
//

// @dxos/mocha platform=browser

import { createCredentialSignerWithKey } from '@dxos/credentials';
import { FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { WebsocketSignalManager } from '@dxos/messaging';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager, createWebRTCTransportFactory } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { createStorage } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';

import { codec } from '../common';
import { DataService } from '../database';
import { MetadataStore } from '../metadata';
import { MOCK_AUTH_PROVIDER, MOCK_AUTH_VERIFIER } from './auth-plugin';
import { SpaceManager } from './space-manager';

describe('space-manager', function () {
  const createPeer = async () => {
    const storage = createStorage();
    const keyring = new Keyring(storage.createDirectory('keyring'));
    const identityKey = await keyring.createKey();

    return new SpaceManager(
      new MetadataStore(storage.createDirectory('metadata')),
      new FeedStore(storage.createDirectory('feeds'), { valueEncoding: codec }),
      new NetworkManager({
        signalManager: new WebsocketSignalManager(['ws://localhost:4000/.well-known/dx/signal']),
        transportFactory: createWebRTCTransportFactory()
      }),
      keyring,
      new DataService(),
      new ModelFactory().registerModel(ObjectModel),
      {
        identityKey,
        deviceKey: await keyring.createKey(),
        credentialAuthenticator: MOCK_AUTH_VERIFIER,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialSigner: createCredentialSignerWithKey(keyring, identityKey)
      }
    );
  };

  it.skip('invitations', async function () {
    const peer1 = await createPeer();
    await peer1.open();
    afterTest(() => peer1.close());

    const peer2 = await createPeer();
    await peer2.open();
    afterTest(() => peer2.close());

    // TODO(dmaretskyi): ???
    // const space = await peer1.createSpace()
    // const invitation = await space.createInvitation()
  });
});
