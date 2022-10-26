//
// Copyright 2022 DXOS.org
//

// @dxos/mocha platform=browser

import { createCredentialSignerWithKey } from '@dxos/credentials';
import { Keyring } from '@dxos/keyring';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { createStorage } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';

import { TestFeedBuilder } from '../common';
import { DataService } from '../database';
import { MetadataStore } from '../metadata';
import { SpaceManager } from './space-manager';
import { MOCK_AUTH_PROVIDER, MOCK_AUTH_VERIFIER, WebsocketNetworkManagerProvider } from './testing';

// TODO(burdon): Config.
// Signal server will be started by the setup script.
const SIGNAL_URL = 'ws://localhost:4000/.well-known/dx/signal';

describe('space-manager', function () {
  const createPeer = async () => {
    const builder = new TestFeedBuilder()
      .setStorage(createStorage(), 'feeds')
      .setKeyring(({ storage }) => new Keyring(storage.createDirectory('keyring')));

    const identityKey = await builder.keyring.createKey();
    const deviceKey = await builder.keyring.createKey();

    // TODO(burdon): Use TestAgentBuilder.
    return new SpaceManager({
      keyring: builder.keyring,
      feedStore: builder.createFeedStore(),
      metadataStore: new MetadataStore(builder.storage.createDirectory('metadata')),
      networkManager: WebsocketNetworkManagerProvider(SIGNAL_URL)(),
      dataService: new DataService(),
      modelFactory: new ModelFactory().registerModel(ObjectModel),
      signingContext: {
        // TODO(burdon): Util to convert to Identity in SpaceProtocol
        identityKey,
        deviceKey,
        credentialAuthenticator: MOCK_AUTH_VERIFIER,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialSigner: createCredentialSignerWithKey(builder.keyring, identityKey)
      }
    });
  };

  it('invitations', async function () {
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
