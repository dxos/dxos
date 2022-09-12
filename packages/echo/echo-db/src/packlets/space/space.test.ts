//
// Copyright 2022 DXOS.org
//

import { Keyring, KeyType } from '@dxos/credentials';
import { createKeyPair } from '@dxos/crypto';
import { codec } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { PublicKey, Timeframe } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import expect from 'expect';
import { it as test } from 'mocha';
import { ControlPipeline } from './control-pipeline';
import { log } from '@dxos/log';

import { Space } from './space';
import { afterTest } from '@dxos/testutils';
import { AdmittedFeed, createCredential, createGenesisCredentialSequence } from '@dxos/halo-protocol';
import assert from 'assert';
import { ObjectModel } from '@dxos/object-model';

describe('space/space', () => {
  // test.only('Genesis', async () => {
  //   const space = new Space({
  //     spaceKey: undefined,
  //     initialTimeframe: undefined,
  //     genesisFeed: undefined,
  //     controlWriteFeed: undefined,
  //     dataWriteFeed: undefined,
  //     feedProvider: undefined
  //   });

  //   // TODO(burdon): Standardize getters.
  //   expect(space.isOpen).toBeFalsy();
  // });

  test('database', async () => {
    const feedStore = new FeedStore(createStorage({ type: StorageType.RAM }).directory(), { valueEncoding: codec });
    const createFeed = () => {
      const { publicKey, secretKey } = createKeyPair();
      return feedStore.openReadWriteFeed(PublicKey.from(publicKey), secretKey);
    };

    const keyring = new Keyring();
    const { publicKey: spaceKey } = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const { publicKey: identityKey } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const { publicKey: deviceKey } = await keyring.createKeyRecord({ type: KeyType.DEVICE });

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

    await space.open()
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
      const item1 = await space.database.createItem<ObjectModel>({ type: 'dxos.example' })
      const item2 = await space.database.createItem<ObjectModel>({ type: 'dxos.example' })
  
      item1.model.set('foo', 'one');
      item2.model.set('foo', 'two');
  
      expect(item1.model.get('foo')).toEqual('one');
      expect(item2.model.get('foo')).toEqual('two');
  
      expect(space.database.select({ type: 'dxos.example' }).exec().entities).toHaveLength(2)
    }
  })
});
