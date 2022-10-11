//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { CredentialGenerator, verifyCredential, createCredentialSignerWithKey } from '@dxos/credentials';
import { codec, Database, MOCK_AUTH_PROVIDER, MOCK_AUTH_VERIFIER, Space } from '@dxos/echo-db';
import { FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { inMemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import { Timeframe } from '@dxos/protocols';
import { AdmittedFeed } from '@dxos/protocols/proto/dxos/halo/credentials';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';

import { createHaloAuthProvider, createHaloAuthVerifier } from './authenticator';
import { Identity } from './identity';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';

const modelFactory = new ModelFactory().registerModel(ObjectModel);

describe('halo/identity', function () {
  it('create', async function () {
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

    const space: Space = new Space({
      spaceKey,
      genesisFeed: controlFeed,
      controlFeed,
      dataFeed,
      initialTimeframe: new Timeframe(),
      feedProvider: key => feedStore.openReadOnlyFeed(key),
      networkManager: new NetworkManager({
        signalManager: new MemorySignalManager(new MemorySignalManagerContext()),
        transportFactory: inMemoryTransportFactory
      }),
      networkPlugins: [],
      swarmIdentity: {
        peerKey: identityKey,
        credentialProvider: createHaloAuthProvider(createCredentialSignerWithKey(keyring, deviceKey)),
        credentialAuthenticator: createHaloAuthVerifier(() => identity.authorizedDeviceKeys)
      },
      databaseFactory: async ({ databaseBackend }) => new Database(modelFactory, databaseBackend, deviceKey),
    });

    const identity = new Identity({
      signer: keyring,
      identityKey,
      deviceKey,
      space
    });

    await identity.open();
    afterTest(() => identity.close());

    //
    // Identity genesis
    //
    {
      const generator = new CredentialGenerator(keyring, identityKey, deviceKey);
      const credentials = [
        ...(await generator.createSpaceGenesis(spaceKey, controlFeed.key)),
        await generator.createDeviceAuthorization(deviceKey),
        await generator.createFeedAdmission(spaceKey, dataFeed.key, AdmittedFeed.Designation.DATA)
      ];

      for (const credential of credentials) {
        await identity.controlPipeline.writer.write({
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential
        });
      }
    }

    // Wait for identity to be ready.
    await identity.ready();
    const identitySigner = identity.getIdentityCredentialSigner();
    const credential = await identitySigner.createCredential({
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

  it('two devices', async function () {
    const signalContext = new MemorySignalManagerContext();

    let spaceKey: PublicKey;
    let genesisFeedKey: PublicKey;
    let identity1: Identity;
    let identity2: Identity;

    //
    // First device
    //
    {
      const keyring = new Keyring();
      const identityKey = await keyring.createKey();
      const deviceKey = await keyring.createKey();
      spaceKey = await keyring.createKey();

      const feedStore = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory(), { valueEncoding: codec });
      const createFeed = async () => {
        const feedKey = await keyring.createKey();
        return feedStore.openReadWriteFeedWithSigner(feedKey, keyring);
      };

      const controlFeed = await createFeed();
      genesisFeedKey = controlFeed.key;

      const dataFeed = await createFeed();

      const space: Space = new Space({
        spaceKey,
        genesisFeed: controlFeed,
        controlFeed,
        dataFeed,
        initialTimeframe: new Timeframe(),
        feedProvider: key => feedStore.openReadOnlyFeed(key),
        networkManager: new NetworkManager({
          signalManager: new MemorySignalManager(signalContext),
          transportFactory: inMemoryTransportFactory
        }),
        networkPlugins: [],
        swarmIdentity: {
          peerKey: deviceKey,
          credentialProvider: MOCK_AUTH_PROVIDER, // createHaloAuthProvider(createCredentialSignerWithKey(keyring, device_key)),
          credentialAuthenticator: MOCK_AUTH_VERIFIER // createHaloAuthVerifier(() => identity.authorizedDeviceKeys),
        },
        databaseFactory: async ({ databaseBackend }) => new Database(modelFactory, databaseBackend, deviceKey),
      });

      const identity = identity1 = new Identity({
        signer: keyring,
        identityKey,
        deviceKey,
        space
      });

      await identity.open();
      afterTest(() => identity.close());

      //
      // Identity genesis
      //
      {
        const generator = new CredentialGenerator(keyring, identityKey, deviceKey);
        const credentials = [
          ...(await generator.createSpaceGenesis(spaceKey, controlFeed.key)),
          await generator.createDeviceAuthorization(deviceKey),
          await generator.createFeedAdmission(spaceKey, dataFeed.key, AdmittedFeed.Designation.DATA)
        ];

        for (const credential of credentials) {
          await identity.controlPipeline.writer.write({
            '@type': 'dxos.echo.feed.CredentialsMessage',
            credential
          });
        }
      }

      // Wait for identity to be ready.
      await identity.ready();
    }

    //
    // Second device
    //
    {
      const keyring = new Keyring();
      const deviceKey = await keyring.createKey();

      const feedStore = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory(), { valueEncoding: codec });
      const createFeed = async () => {
        const feedKey = await keyring.createKey();
        return feedStore.openReadWriteFeedWithSigner(feedKey, keyring);
      };

      const controlFeed = await createFeed();
      const dataFeed = await createFeed();

      const space: Space = new Space({
        spaceKey,
        genesisFeed: await feedStore.openReadOnlyFeed(genesisFeedKey),
        controlFeed,
        dataFeed,
        initialTimeframe: new Timeframe(),
        feedProvider: key => feedStore.openReadOnlyFeed(key),
        networkManager: new NetworkManager({
          signalManager: new MemorySignalManager(signalContext),
          transportFactory: inMemoryTransportFactory
        }),
        networkPlugins: [],
        swarmIdentity: {
          peerKey: deviceKey,
          credentialProvider: MOCK_AUTH_PROVIDER, // createHaloAuthProvider(createCredentialSignerWithKey(keyring, device_key)),
          credentialAuthenticator: MOCK_AUTH_VERIFIER // createHaloAuthVerifier(() => identity.authorizedDeviceKeys),
        },
        databaseFactory: async ({ databaseBackend }) => new Database(modelFactory, databaseBackend, deviceKey),
      });

      const identity = identity2 = new Identity({
        signer: keyring,
        identityKey: identity1.identityKey,
        deviceKey,
        space
      });

      await identity.open();
      afterTest(() => identity.close());
    }

    //
    // Second device admission
    //
    {
      const signer = identity1.getIdentityCredentialSigner();
      void identity1.controlPipeline.writer.write({
        '@type': 'dxos.echo.feed.CredentialsMessage',
        credential: await signer.createCredential({
          subject: identity2.deviceKey,
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            identityKey: identity1.identityKey,
            deviceKey: identity2.deviceKey
          }
        })
      });

      await identity2.ready();
    }

    expect(Array.from(identity1.authorizedDeviceKeys.values())).toEqual([identity1.deviceKey, identity2.deviceKey]);
    expect(Array.from(identity2.authorizedDeviceKeys.values())).toEqual([identity1.deviceKey, identity2.deviceKey]);
  });
});
