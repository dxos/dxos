//
// Copyright 2022 DXOS.org
//

// @dxos/mocha platform=browser

import { createCredentialSignerWithKey } from '@dxos/credentials';
import { FeedFactory, FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { WebsocketSignalManager } from '@dxos/messaging';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager, createWebRTCTransportFactory } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { createStorage } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';

import { valueEncoding } from '../common';
import { DataService } from '../database';
import { MetadataStore } from '../metadata';
import { MOCK_AUTH_PROVIDER, MOCK_AUTH_VERIFIER } from '../testing';
import { SpaceManager } from './space-manager';

// TODO(burdon): Config.
// Signal server will be started by the setup script.
const SIGNAL_URL = 'ws://localhost:4000/.well-known/dx/signal';

describe('space-manager', function () {
  const createPeer = async () => {
    const storage = createStorage();
    const keyring = new Keyring(storage.createDirectory('keyring'));
    const identityKey = await keyring.createKey();

    return new SpaceManager(
      new MetadataStore(storage.createDirectory('metadata')),
      new FeedStore<FeedMessage>({
        factory: new FeedFactory<FeedMessage>({
          root: storage.createDirectory('feeds'),
          signer: keyring,
          hypercore: {
            valueEncoding
          }
        })
      }),
      new NetworkManager({
        // TODO(burdon): Config.
        signalManager: new WebsocketSignalManager([SIGNAL_URL]),
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
