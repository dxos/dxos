//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { codec } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { AdmittedFeed, CredentialGenerator, verifyCredential } from '@dxos/halo-protocol';
import { Keyring } from '@dxos/keyring';
import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { NetworkManager } from '@dxos/network-manager';
import { Timeframe } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';

import { MOCK_CREDENTIAL_AUTHENTICATOR, MOCK_CREDENTIAL_PROVIDER } from '../space';
import { Identity } from './identity';

describe('halo/identity', () => {
  test('create', async () => {
    const keyring = new Keyring();
    const identityKey = await keyring.createKey();
    const deviceKey = await keyring.createKey();
    const spaceKey = await keyring.createKey();

    const feedStore = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory(), { valueEncoding: codec });
    const createFeed = async () => {
      const feedKey = await keyring.createKey();
      return feedStore.openReadWriteFeedWithSigner(feedKey, keyring);
    };

    const controlFeed = await createFeed();
    const dataFeed = await createFeed();

    const identity = new Identity({
      signer: keyring,
      identityKey,
      deviceKey,
      spaceParams: {
        spaceKey,
        genesisFeed: controlFeed,
        controlWriteFeed: controlFeed,
        dataWriteFeed: dataFeed,
        initialTimeframe: new Timeframe(),
        feedProvider: key => feedStore.openReadOnlyFeed(key),
        networkManager: new NetworkManager({
          signalManager: new MemorySignalManager(new MemorySignalManagerContext())
        }),
        networkPlugins: [],
        swarmIdentity: {
          peerKey: identityKey,
          credentialProvider: MOCK_CREDENTIAL_PROVIDER,
          credentialAuthenticator: MOCK_CREDENTIAL_AUTHENTICATOR
        }
      }
    });

    await identity.open();
    afterTest(() => identity.close());

    //
    // Identity genesis
    //
    {
      const generator = new CredentialGenerator(keyring, identityKey, deviceKey);
      const credentials = [
        ...await generator.createGenesis(spaceKey, controlFeed.key),
        await generator.createDeviceAuthorization(deviceKey),
        await generator.createFeedAdmission(spaceKey, dataFeed.key, AdmittedFeed.Designation.DATA)
      ];

      for (const credential of credentials) {
        await identity.controlMessageWriter?.write({
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential
        });
      }
    }

    // Wait for identity to be ready.
    await identity.ready.wait();

    const identitySigner = identity.getIdentityCredentialSigner();
    const credential = await identitySigner({
      subject: identityKey,
      assertion: {
        '@type': 'dxos.halo.credentials.IdentityProfile',
        profile: {
          displayName: 'Alice'
        }
      }
    });

    expect(credential.issuer).toEqual(identityKey);
    expect(await verifyCredential(credential)).toEqual({ kind: 'pass' });
  });
});
