//
// Copyright 2022 DXOS.org
//

import { codec, DataService, MetadataStore, MOCK_AUTH_PROVIDER, MOCK_AUTH_VERIFIER, SpaceManager } from '@dxos/echo-db';
import { FeedStore } from '@dxos/feed-store';
import { createCredentialSignerWithKey } from '@dxos/credentials';
import { Keyring } from '@dxos/keyring';
import { WebsocketSignalManager } from '@dxos/messaging';
import { NetworkManager } from '@dxos/network-manager';
import { createStorage } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';

describe('space-manager', () => {
  const createPeer = async () => {
    const storage = createStorage();
    const keyring = new Keyring(storage.createDirectory('keyring'));

    const identityKey = await keyring.createKey();
    return new SpaceManager(
      new MetadataStore(storage.createDirectory('metadata')),
      new FeedStore(storage.createDirectory('feeds'), { valueEncoding: codec }),
      new NetworkManager({
        signalManager: new WebsocketSignalManager(['ws://localhost:4000/.well-known/dx/signal'])
      }),
      keyring,
      new DataService(),
      {
        identityKey,
        deviceKey: await keyring.createKey(),
        credentialAuthenticator: MOCK_AUTH_VERIFIER,
        credentialProvider: MOCK_AUTH_PROVIDER,
        credentialSigner: createCredentialSignerWithKey(keyring, identityKey)
      }
    );
  };

  it.skip('invitations', async () => {
    const peer1 = await createPeer();
    await peer1.open();
    afterTest(() => peer1.close());

    const peer2 = await createPeer();
    await peer2.open();
    afterTest(() => peer2.close());

    // TODO(dmaretskyi): .
    // const space = await peer1.createSpace()
    // const invitation = await space.createInvitation()

  });
});
