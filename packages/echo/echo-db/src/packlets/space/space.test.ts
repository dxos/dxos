//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import expect from 'expect';
import { it as test } from 'mocha';

import { codec } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { AdmittedFeed, createCredential, createGenesisCredentialSequence, PartyMember } from '@dxos/halo-protocol';
import { Keyring } from '@dxos/keyring';
import { ObjectModel } from '@dxos/object-model';
import { PublicKey, Timeframe } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';

import { Space } from './space';
import { NetworkManager } from '@dxos/network-manager';
import { MOCK_CREDENTIAL_AUTHENTICATOR, MOCK_CREDENTIAL_PROVIDER } from './space-protocol';

describe('space/space', () => {
  test('database', async () => {
    const keyring = new Keyring();
    const spaceKey = await keyring.createKey();
    const identityKey = await keyring.createKey();
    const deviceKey = await keyring.createKey();

    const feedStore = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory(), { valueEncoding: codec });
    const createFeed = async () => {
      const feedKey = await keyring.createKey();
      return feedStore.openReadWriteFeedWithSigner(feedKey, keyring);
    };

    // TODO(dmaretskyi): Separate test for cold start after genesis.
    const controlFeed = await createFeed();
    const dataFeed = await createFeed();

    const space = new Space({
      spaceKey,
      genesisFeed: controlFeed,
      controlWriteFeed: controlFeed,
      dataWriteFeed: dataFeed,
      initialTimeframe: new Timeframe(),
      feedProvider: key => feedStore.openReadOnlyFeed(key),
      networkManager: new NetworkManager(),
      networkPlugins: [],
      swarmIdentity: {
        peerKey: identityKey,
        credentialProvider: MOCK_CREDENTIAL_PROVIDER,
        credentialAuthenticator: MOCK_CREDENTIAL_AUTHENTICATOR,
      }
    });

    await space.open();
    expect(space.isOpen).toBeTruthy(); // TODO(burdon): Standardize boolean state getters.
    afterTest(() => space.close());

    //
    // Genesis
    //
    {
      // TODO(burdon): Don't export functions from packages (group into something more accountable).
      const genesisMessages = await createGenesisCredentialSequence(
        keyring,
        spaceKey,
        identityKey,
        deviceKey,
        controlFeed.key
      );

      for (const credential of genesisMessages) {
        await space.controlMessageWriter?.write({
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential
        });
      }

      await space.controlMessageWriter?.write({
        '@type': 'dxos.echo.feed.CredentialsMessage',
        credential: await createCredential({
          issuer: identityKey,
          subject: dataFeed.key,
          assertion: {
            '@type': 'dxos.halo.credentials.AdmittedFeed',
            partyKey: spaceKey,
            identityKey,
            deviceKey,
            designation: AdmittedFeed.Designation.DATA
          },
          keyring
        })
      });

      await space.controlPipelineState!.waitUntilReached(space.controlPipelineState!.endTimeframe);
    }

    {
      assert(space.database);
      const item1 = await space.database.createItem<ObjectModel>({ type: 'dxos.example' });
      const item2 = await space.database.createItem<ObjectModel>({ type: 'dxos.example' });

      await item1.model.set('foo', 'one');
      await item2.model.set('foo', 'two');

      expect(item1.model.get('foo')).toEqual('one');
      expect(item2.model.get('foo')).toEqual('two');

      expect(space.database.select({ type: 'dxos.example' }).exec().entities).toHaveLength(2);
    }
  });

  test('2 spaces replicating', async () => {
    let spaceKey!: PublicKey
    let genesisFeedKey!: PublicKey;
    let agent1Keyring!: Keyring;
    let agent1Identity!: PublicKey;
    let agent1Space!: Space;
    let agent2Space!: Space;

    //
    // Agent 1
    //
    {
      const keyring = agent1Keyring = new Keyring();
      spaceKey = await keyring.createKey();
      const identityKey = agent1Identity = await keyring.createKey();
      const deviceKey = await keyring.createKey();

      const feedStore = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory(), { valueEncoding: codec });
      const createFeed = async () => {
        const feedKey = await keyring.createKey();
        return feedStore.openReadWriteFeedWithSigner(feedKey, keyring);
      };

      // TODO(dmaretskyi): Separate test for cold start after genesis.
      const controlFeed = await createFeed();
      const dataFeed = await createFeed();

      genesisFeedKey = controlFeed.key;

      const space = agent1Space = new Space({
        spaceKey,
        genesisFeed: controlFeed,
        controlWriteFeed: controlFeed,
        dataWriteFeed: dataFeed,
        initialTimeframe: new Timeframe(),
        feedProvider: key => feedStore.openReadOnlyFeed(key),
        networkManager: new NetworkManager(),
        networkPlugins: [],
        swarmIdentity: {
          peerKey: identityKey,
          credentialProvider: MOCK_CREDENTIAL_PROVIDER,
          credentialAuthenticator: MOCK_CREDENTIAL_AUTHENTICATOR,
        }
      });

      await space.open();
      expect(space.isOpen).toBeTruthy();
      afterTest(() => space.close());

      //
      // Genesis
      //
      {
        // TODO(burdon): Don't export functions from packages (group into something more accountable).
        const genesisMessages = await createGenesisCredentialSequence(
          keyring,
          spaceKey,
          identityKey,
          deviceKey,
          controlFeed.key
        );

        for (const credential of genesisMessages) {
          await space.controlMessageWriter?.write({
            '@type': 'dxos.echo.feed.CredentialsMessage',
            credential
          });
        }

        await space.controlMessageWriter?.write({
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential: await createCredential({
            issuer: identityKey,
            subject: dataFeed.key,
            assertion: {
              '@type': 'dxos.halo.credentials.AdmittedFeed',
              partyKey: spaceKey,
              identityKey,
              deviceKey,
              designation: AdmittedFeed.Designation.DATA
            },
            keyring
          })
        });

        await space.controlPipelineState!.waitUntilReached(space.controlPipelineState!.endTimeframe);
      }
    }

    //
    // Agent 2
    //
    {
      const keyring = new Keyring();
      const identityKey = await keyring.createKey();
      const deviceKey = await keyring.createKey();

      const feedStore = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory(), { valueEncoding: codec });
      const createFeed = async () => {
        const feedKey = await keyring.createKey();
        return feedStore.openReadWriteFeedWithSigner(feedKey, keyring);
      };

      // TODO(dmaretskyi): Separate test for cold start after genesis.
      const genesisFeed = await feedStore.openReadOnlyFeed(genesisFeedKey);
      const controlFeed = await createFeed()
      const dataFeed = await createFeed();

      const space = agent2Space = new Space({
        spaceKey,
        genesisFeed,
        controlWriteFeed: controlFeed,
        dataWriteFeed: dataFeed,
        initialTimeframe: new Timeframe(),
        feedProvider: key => feedStore.openReadOnlyFeed(key),
        networkManager: new NetworkManager(),
        networkPlugins: [],
        swarmIdentity: {
          peerKey: identityKey,
          credentialProvider: MOCK_CREDENTIAL_PROVIDER,
          credentialAuthenticator: MOCK_CREDENTIAL_AUTHENTICATOR,
        }
      });

      await space.open();
      expect(space.isOpen).toBeTruthy();
      afterTest(() => space.close());

      //
      // Agent 1 admits Agent 2 to the space.
      //
      {
        await agent1Space.controlMessageWriter?.write({
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential: await createCredential({
            issuer: agent1Identity,
            subject: identityKey,
            assertion: {
              '@type': 'dxos.halo.credentials.PartyMember',
              partyKey: spaceKey,
              role: PartyMember.Role.MEMBER
            },
            keyring: agent1Keyring
          })
        });

        await agent1Space.controlMessageWriter?.write({
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential: await createCredential({
            issuer: agent1Identity,
            subject: controlFeed.key,
            assertion: {
              '@type': 'dxos.halo.credentials.AdmittedFeed',
              partyKey: spaceKey,
              identityKey,
              deviceKey,
              designation: AdmittedFeed.Designation.CONTROL
            },
            keyring: agent1Keyring
          })
        });

        await agent1Space.controlMessageWriter?.write({
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential: await createCredential({
            issuer: agent1Identity,
            subject: dataFeed.key,
            assertion: {
              '@type': 'dxos.halo.credentials.AdmittedFeed',
              partyKey: spaceKey,
              identityKey,
              deviceKey,
              designation: AdmittedFeed.Designation.DATA
            },
            keyring: agent1Keyring
          })
        });
      }

      // Agent 1 reads all written feed messages.
      await agent1Space.controlPipelineState!.waitUntilReached(agent1Space.controlPipelineState!.endTimeframe);

      // Agent 2 reads all written feed messages.
      await space.controlPipelineState!.waitUntilReached(agent1Space.controlPipelineState!.endTimeframe);
    }

    {
      const item1 = await agent1Space.database!.createItem({ type: 'dxos.example.1' });
      console.log('created item');

      const item2 = await agent2Space.database!.waitForItem({ type: 'dxos.example.1' });
      expect(item1.id).toEqual(item2.id);
    }

    console.log('1 -> 2 works')
    
    {
      const item1 = await agent2Space.database!.createItem({ type: 'dxos.example.2' });
      const item2 = await agent1Space.database!.waitForItem({ type: 'dxos.example.2' });
      expect(item1.id).toEqual(item2.id);
    }
  })
});
