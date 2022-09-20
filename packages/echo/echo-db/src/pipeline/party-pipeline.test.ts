//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { promiseTimeout, sleep } from '@dxos/async';
import { Keyring } from '@dxos/credentials';
import { createId } from '@dxos/crypto';
import { checkType, todo } from '@dxos/debug';
import { FeedStore } from '@dxos/feed-store';
import { createCredential, AdmittedFeed, PartyMember } from '@dxos/halo-protocol';
import { PublicKey } from '@dxos/keys';
import { createTestProtocolPair } from '@dxos/mesh-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { Timeframe } from '@dxos/protocols';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { KeyType } from '@dxos/protocols/proto/dxos/halo/keys';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';

import { codec } from '../../codec';
import { createReplicatorPlugin } from '../protocol';
import { SnapshotStore } from '../snapshots';
import { MetadataStore } from './metadata-store';
import { PartyFeedProvider } from './party-feed-provider';
import { PartyPipeline } from './party-pipeline';

describe.skip('PartyPipeline', () => {
  const setup = async () => {
    const storage = createStorage({ type: StorageType.RAM });
    const feedStore = new FeedStore(storage.createDirectory('feed'), { valueEncoding: codec });
    afterTest(async () => feedStore.close());

    const keyring = new Keyring();

    const metadataStore = new MetadataStore(storage.createDirectory('metadata'));

    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const snapshotStore = new SnapshotStore(storage.createDirectory('snapshots'));

    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const deviceKey = await keyring.createKeyRecord({ type: KeyType.DEVICE });

    const partyFeedProvider = new PartyFeedProvider(metadataStore, keyring, feedStore, partyKey.publicKey);

    const party = new PartyPipeline(
      partyKey.publicKey,
      partyFeedProvider,
      modelFactory,
      snapshotStore,
      PublicKey.random()
    );

    const feed = await partyFeedProvider.createOrOpenWritableFeed();
    await party.open({ genesisFeedKey: feed.key });
    afterTest(async () => party.close());

    // PartyGenesis (self-signed by Party).
    await party.credentialsWriter.write(await createCredential({
      issuer: partyKey.publicKey,
      subject: partyKey.publicKey,
      assertion: {
        '@type': 'dxos.halo.credentials.PartyGenesis',
        partyKey: partyKey.publicKey
      },
      keyring
    }));

    await party.credentialsWriter.write(await createCredential({
      issuer: partyKey.publicKey,
      subject: identityKey.publicKey,
      assertion: {
        '@type': 'dxos.halo.credentials.PartyMember',
        partyKey: partyKey.publicKey,
        role: PartyMember.Role.ADMIN
      },
      keyring
    }));

    await party.credentialsWriter.write(await createCredential({
      issuer: identityKey.publicKey,
      subject: feed.key,
      assertion: {
        '@type': 'dxos.halo.credentials.AdmittedFeed',
        partyKey: partyKey.publicKey,
        deviceKey: deviceKey.publicKey,
        identityKey: identityKey.publicKey,
        designation: AdmittedFeed.Designation.CONTROL
      },
      keyring
    }));

    return { party, feedKey: feed.key, feed, feedStore, partyKey, keyring, partyFeedProvider, identityKey, deviceKey };
  };

  test('create & have the feed key admitted', async () => {
    const { party, feedKey } = await setup();

    await party.processor.keyOrInfoAdded.waitForCondition(() => party.processor.memberKeys.length === 1);
    await party.processor.feedAdded.waitForCondition(() => party.processor.feedKeys.length === 1);

    expect(party.processor.isFeedAdmitted(feedKey)).toBeTruthy();
  });

  test('create item', async () => {
    const { party } = await setup();

    const item = await party.database.createItem({ model: ObjectModel });
    await item.model.set('foo', 'bar');

    expect(item.model.get('foo')).toEqual('bar');
  });

  test('create item with parent and then reload', async () => {
    const { party, feedKey } = await setup();

    {
      const parent = await party.database.createItem({ model: ObjectModel, type: 'parent' });
      const child = await party.database.createItem({
        model: ObjectModel,
        parent: parent.id,
        type: 'child'
      });

      expect(child.parent).toEqual(parent);
      expect(parent.children).toContain(child);
    }

    await party.close();
    await party.open({ genesisFeedKey: feedKey });

    {
      await party.database.select().exec().update.waitFor(result => result.entities.length === 2);
      const parent = party.database.select({ type: 'parent' }).exec().entities[0];
      const child = party.database.select({ type: 'child' }).exec().entities[0];

      expect(child.parent).toEqual(parent);
      expect(parent.children).toContain(child);
    }
  });

  test('feed admit message triggers new feed to be opened', async () => {
    const { party, partyKey, keyring, partyFeedProvider, feedStore, identityKey, deviceKey } = await setup();

    const feedKey = await keyring.createKeyRecord({ type: KeyType.FEED });

    const eventFired = feedStore.feedOpenedEvent.waitForCount(1);
    await party.credentialsWriter.write(await createCredential({
      issuer: identityKey.publicKey,
      subject: feedKey.publicKey,
      assertion: {
        '@type': 'dxos.halo.credentials.AdmittedFeed',
        partyKey: partyKey.publicKey,
        deviceKey: deviceKey.publicKey,
        identityKey: identityKey.publicKey,
        designation: AdmittedFeed.Designation.CONTROL
      },
      keyring
    }));
    await promiseTimeout(eventFired, 1000, new Error('timeout'));
    expect(partyFeedProvider.getFeeds().find(k => k.key.equals(feedKey.publicKey))).toBeTruthy();
  });

  test('does not open unrelated feeds', async () => {
    const storage = createStorage({ type: StorageType.RAM });
    const feedStore = new FeedStore(storage.createDirectory('feed'), { valueEncoding: codec });
    afterTest(async () => feedStore.close());

    const keyring = new Keyring();

    const metadataStore = new MetadataStore(storage.createDirectory('metadata'));

    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const snapshotStore = new SnapshotStore(storage.createDirectory('snapshots'));

    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });

    const partyFeedProvider = new PartyFeedProvider(metadataStore, keyring, feedStore, partyKey.publicKey);

    const otherFeedKey = PublicKey.random();

    const party = new PartyPipeline(
      partyKey.publicKey,
      partyFeedProvider,
      modelFactory,
      snapshotStore,
      PublicKey.random()
    );

    const writeFeed = await partyFeedProvider.createOrOpenWritableFeed();

    await party.open({ genesisFeedKey: writeFeed.key });
    afterTest(async () => party.close());

    // Wait for events to be processed.
    await sleep(5);

    expect(partyFeedProvider.getFeeds().some(k => k.key.equals(otherFeedKey))).toEqual(false);
  });

  test('manually create item', async () => {
    const { party, partyFeedProvider } = await setup();

    const feed = await partyFeedProvider.createOrOpenWritableFeed();

    const itemId = createId();
    await feed.feed.append(checkType<FeedMessage>(todo() /* {
      timeframe: new Timeframe(),
      echo: {
        itemId,
        genesis: {
          itemType: 'dxos:example',
          modelType: ObjectModel.meta.type
        }
      }
    } */));

    await promiseTimeout(party.database.waitForItem({ id: itemId }), 1000, new Error('timeout'));
  });

  test('admit a second feed to the party', async () => {
    const { party, keyring, partyKey, feedStore, identityKey, deviceKey } = await setup();

    const feedKey = await keyring.createKeyRecord({ type: KeyType.FEED });
    const fullKey = keyring.getFullKey(feedKey.publicKey);
    const feed2 = await feedStore.openReadWriteFeed(fullKey!.publicKey, fullKey!.secretKey!);

    await party.credentialsWriter.write(await createCredential({
      issuer: identityKey.publicKey,
      subject: feedKey.publicKey,
      assertion: {
        '@type': 'dxos.halo.credentials.AdmittedFeed',
        partyKey: partyKey.publicKey,
        deviceKey: deviceKey.publicKey,
        identityKey: identityKey.publicKey,
        designation: AdmittedFeed.Designation.CONTROL
      },
      keyring
    }));

    const itemId = createId();
    await feed2.append(checkType<FeedMessage>({
      timeframe: new Timeframe(),
      echo: {
        itemId,
        genesis: {
          itemType: 'dxos:example',
          modelType: ObjectModel.meta.type
        }
      }
    }));

    await promiseTimeout(party.database.waitForItem({ id: itemId }), 1000, new Error('timeout'));
  });

  test('admit feed and then open it', async () => {
    const { party, keyring, partyKey, feedStore, identityKey, deviceKey } = await setup();

    const feedKey = await keyring.createKeyRecord({ type: KeyType.FEED });
    const fullKey = keyring.getFullKey(feedKey.publicKey);

    await party.credentialsWriter.write(await createCredential({
      issuer: identityKey.publicKey,
      subject: feedKey.publicKey,
      assertion: {
        '@type': 'dxos.halo.credentials.AdmittedFeed',
        partyKey: partyKey.publicKey,
        deviceKey: deviceKey.publicKey,
        identityKey: identityKey.publicKey,
        designation: AdmittedFeed.Designation.CONTROL
      },
      keyring
    }));

    const feed2 = await feedStore.openReadWriteFeed(fullKey!.publicKey, fullKey!.secretKey!);
    const itemId = createId();
    await feed2.append(checkType<FeedMessage>({
      timeframe: new Timeframe(),
      echo: {
        itemId,
        genesis: {
          itemType: 'dxos:example',
          modelType: ObjectModel.meta.type
        }
      }
    }));

    await promiseTimeout(party.database.waitForItem({ id: itemId }), 1000, new Error('timeout'));
  });

  test('wait to reach specific timeframe', async () => {
    const { party, feedKey } = await setup();

    {
      const parent = await party.database.createItem({ model: ObjectModel, type: 'parent' });
      const child = await party.database.createItem({
        model: ObjectModel,
        parent: parent.id,
        type: 'child'
      });

      expect(child.parent).toEqual(parent);
      expect(parent.children).toContain(child);
    }

    const timeframe = party.timeframe;
    expect(timeframe.isEmpty()).toBeFalsy();

    await party.close();
    await party.open({ genesisFeedKey: feedKey, targetTimeframe: timeframe });
  });

  test('two instances replicating', async () => {
    const peer1 = await setup();

    const storage = createStorage({ type: StorageType.RAM });
    const feedStore = new FeedStore(storage.createDirectory('feed'), { valueEncoding: codec });
    afterTest(async () => feedStore.close());

    const metadataStore = new MetadataStore(storage.createDirectory('metadata'));

    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const snapshotStore = new SnapshotStore(storage.createDirectory('snapshots'));

    const partyFeedProvider = new PartyFeedProvider(metadataStore, peer1.keyring, feedStore, peer1.party.key);

    const party2 = new PartyPipeline(
      peer1.party.key,
      partyFeedProvider,
      modelFactory,
      snapshotStore,
      PublicKey.random()
    );

    const feed2 = await partyFeedProvider.createOrOpenWritableFeed();
    await peer1.party.credentialsWriter.write(await createCredential({
      issuer: peer1.identityKey.publicKey,
      subject: feed2.key,
      assertion: {
        '@type': 'dxos.halo.credentials.AdmittedFeed',
        partyKey: peer1.partyKey.publicKey,
        deviceKey: peer1.deviceKey.publicKey,
        identityKey: peer1.identityKey.publicKey,
        designation: AdmittedFeed.Designation.CONTROL
      },
      keyring: peer1.keyring
    }));

    await party2.open({ genesisFeedKey: peer1.feedKey });

    afterTest(async () => party2.close());

    createTestProtocolPair(
      [createReplicatorPlugin(peer1.partyFeedProvider).createExtension()],
      [createReplicatorPlugin(partyFeedProvider).createExtension()]
    );

    const item1 = await peer1.party.database.createItem();
    await promiseTimeout(party2.database.waitForItem({ id: item1.id }), 1000, new Error('timeout'));
  });
});
