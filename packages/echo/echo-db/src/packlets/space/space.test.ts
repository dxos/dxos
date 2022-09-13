//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import expect from 'expect';
import { it as test } from 'mocha';

import { Keyring } from '@dxos/keyring';
import { createKeyPair } from '@dxos/crypto';
import { codec } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { AdmittedFeed, createCredential, createGenesisCredentialSequence } from '@dxos/halo-protocol';
import { ObjectModel } from '@dxos/object-model';
import { PublicKey, Timeframe } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';

import { Space } from './space';

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
      feedProvider: key => feedStore.openReadOnlyFeed(key)
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

      item1.model.set('foo', 'one');
      item2.model.set('foo', 'two');

      expect(item1.model.get('foo')).toEqual('one');
      expect(item2.model.get('foo')).toEqual('two');

      expect(space.database.select({ type: 'dxos.example' }).exec().entities).toHaveLength(2);
    }
  });
});
