//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { promiseTimeout } from '@dxos/async';
import { createFeedAdmitMessage, createPartyGenesisMessage, Keyring, KeyType } from '@dxos/credentials';
import { createId, PublicKey } from '@dxos/crypto';
import { codec, Timeframe } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { createTestProtocolPair } from '@dxos/mesh-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { createStorage, StorageType } from '@dxos/random-access-multi-storage';
import { afterTest } from '@dxos/testutils';

import { MetadataStore, PartyFeedProvider } from '../pipeline';
import { createReplicatorPlugin } from '../protocol/replicator-plugin';
import { SnapshotStore } from '../snapshots';
import { PartyCore } from './party-core';

describe('PartyCore', () => {
  const setup = async () => {
    const storage = createStorage('', StorageType.RAM);
    const feedStore = new FeedStore(storage, { valueEncoding: codec });
    afterTest(async () => feedStore.close());

    const keyring = new Keyring();

    const metadataStore = new MetadataStore(createStorage('metadata', StorageType.RAM));

    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const snapshotStore = new SnapshotStore(createStorage('snapshots', StorageType.RAM));

    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });

    const partyFeedProvider = new PartyFeedProvider(metadataStore, keyring, feedStore, partyKey.publicKey);

    const party = new PartyCore(
      partyKey.publicKey,
      partyFeedProvider,
      modelFactory,
      snapshotStore,
      PublicKey.random()
    );

    const feed = await partyFeedProvider.createOrOpenWritableFeed();
    await party.open();
    afterTest(async () => party.close());

    // PartyGenesis (self-signed by Party).
    await party.writeCredentialsMessage(createPartyGenesisMessage(
      keyring,
      partyKey,
      feed.key,
      partyKey)
    );

    // FeedAdmit (signed by the Device KeyChain).
    await party.writeCredentialsMessage(createFeedAdmitMessage(
      keyring,
      partyKey.publicKey,
      feed.key,
      [partyKey]
    ));

    return { party, feedKey: feed.key, feed, feedStore, partyKey, keyring, partyFeedProvider };
  };

  test('create & have the feed key admitted', async () => {
    const { party, feedKey } = await setup();

    await party.processor.keyOrInfoAdded.waitForCount(1);

    expect(party.processor.isFeedAdmitted(feedKey)).toBeTruthy();
  });

  test('create item', async () => {
    const { party } = await setup();

    const item = await party.database.createItem({ model: ObjectModel });
    await item.model.set('foo', 'bar');

    expect(item.model.get('foo')).toEqual('bar');
  });

  test('create item with parent and then reload', async () => {
    const { party } = await setup();

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
    await party.open();

    {
      await party.database.select().exec().update.waitFor(result => result.entities.length === 2);
      const parent = party.database.select({ type: 'parent' }).exec().entities[0];
      const child = party.database.select({ type: 'child' }).exec().entities[0];

      expect(child.parent).toEqual(parent);
      expect(parent.children).toContain(child);
    }
  });

  test('feed admit message triggers new feed to be opened', async () => {
    const { party, partyKey, keyring, partyFeedProvider, feedStore } = await setup();

    const feedKey = await keyring.createKeyRecord({ type: KeyType.FEED });

    const eventFired = feedStore.feedOpenedEvent.waitForCount(1);
    await party.writeCredentialsMessage(createFeedAdmitMessage(
      keyring,
      party.key,
      feedKey.publicKey,
      [partyKey]
    ));
    await promiseTimeout(eventFired, 1000, new Error('timeout'));
    expect(partyFeedProvider.getFeeds().find(k => k.key.equals(feedKey.publicKey))).toBeTruthy();
  });

  test('opens feed from hints', async () => {
    const storage = createStorage('', StorageType.RAM);
    const feedStore = new FeedStore(storage, { valueEncoding: codec });
    afterTest(async () => feedStore.close());

    const keyring = new Keyring();

    const metadataStore = new MetadataStore(createStorage('metadata', StorageType.RAM));

    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const snapshotStore = new SnapshotStore(createStorage('snapshots', StorageType.RAM));

    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });

    const partyFeedProvider = new PartyFeedProvider(metadataStore, keyring, feedStore, partyKey.publicKey);

    const otherFeedKey = PublicKey.random();

    const party = new PartyCore(
      partyKey.publicKey,
      partyFeedProvider,
      modelFactory,
      snapshotStore,
      PublicKey.random()
    );

    await partyFeedProvider.createOrOpenWritableFeed();

    const feedOpened = feedStore.feedOpenedEvent.waitForCount(1);

    await party.open([{ type: KeyType.FEED, publicKey: otherFeedKey }]);
    afterTest(async () => party.close());

    await feedOpened;

    expect(partyFeedProvider.getFeeds().some(k => k.key.equals(otherFeedKey))).toEqual(true);
  });

  test('manually create item', async () => {
    const { party, partyFeedProvider } = await setup();
    await party.open();

    const feed = await partyFeedProvider.createOrOpenWritableFeed();

    const itemId = createId();
    await feed.feed.append({
      echo: {
        itemId,
        genesis: {
          itemType: 'dxos:example',
          modelType: ObjectModel.meta.type
        },
        timeframe: new Timeframe()
      }
    });

    await promiseTimeout(party.database.waitForItem({ id: itemId }), 1000, new Error('timeout'));
  });

  test('admit a second feed to the party', async () => {
    const { party, keyring, partyKey, feedStore } = await setup();
    await party.open();

    const feedKey = await keyring.createKeyRecord({ type: KeyType.FEED });
    const fullKey = keyring.getFullKey(feedKey.publicKey);
    const feed2 = await feedStore.openReadWriteFeed(fullKey!.publicKey, fullKey!.secretKey!);

    await party.writeCredentialsMessage(createFeedAdmitMessage(
      keyring,
      party.key,
      feed2.key,
      [partyKey]
    ));

    const itemId = createId();
    await feed2.append({
      echo: {
        itemId,
        genesis: {
          itemType: 'dxos:example',
          modelType: ObjectModel.meta.type
        },
        timeframe: new Timeframe()
      }
    });

    await promiseTimeout(party.database.waitForItem({ id: itemId }), 1000, new Error('timeout'));
  });

  test('admit feed and then open it', async () => {
    const { party, keyring, partyKey, feedStore } = await setup();
    await party.open();

    const feedKey = await keyring.createKeyRecord({ type: KeyType.FEED });
    const fullKey = keyring.getFullKey(feedKey.publicKey);

    await party.writeCredentialsMessage(createFeedAdmitMessage(
      keyring,
      party.key,
      feedKey.publicKey,
      [partyKey]
    ));

    const feed2 = await feedStore.openReadWriteFeed(fullKey!.publicKey, fullKey!.secretKey!);
    const itemId = createId();
    await feed2.append({
      echo: {
        itemId,
        genesis: {
          itemType: 'dxos:example',
          modelType: ObjectModel.meta.type
        },
        timeframe: new Timeframe()
      }
    });

    await promiseTimeout(party.database.waitForItem({ id: itemId }), 1000, new Error('timeout'));
  });

  test('two instances replicating', async () => {
    const peer1 = await setup();

    const storage = createStorage('', StorageType.RAM);
    const feedStore = new FeedStore(storage, { valueEncoding: codec });
    afterTest(async () => feedStore.close());

    const metadataStore = new MetadataStore(createStorage('metadata', StorageType.RAM));

    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const snapshotStore = new SnapshotStore(createStorage('snapshots', StorageType.RAM));

    const partyFeedProvider = new PartyFeedProvider(metadataStore, peer1.keyring, feedStore, peer1.party.key);

    const party2 = new PartyCore(
      peer1.party.key,
      partyFeedProvider,
      modelFactory,
      snapshotStore,
      PublicKey.random()
    );

    const feed2 = await partyFeedProvider.createOrOpenWritableFeed();

    await peer1.party.writeCredentialsMessage(createFeedAdmitMessage(
      peer1.keyring,
      peer1.party.key,
      feed2.key,
      [peer1.partyKey]
    ));

    await party2.open([{
      publicKey: peer1.feedKey,
      type: KeyType.FEED
    }]);
    afterTest(async () => party2.close());

    createTestProtocolPair(
      [createReplicatorPlugin(peer1.partyFeedProvider).createExtension()],
      [createReplicatorPlugin(partyFeedProvider).createExtension()]
    );

    const item1 = await peer1.party.database.createItem();
    await promiseTimeout(party2.database.waitForItem({ id: item1.id }), 1000, new Error('timeout'));
  });
});
