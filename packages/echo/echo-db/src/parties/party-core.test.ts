//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { createEnvelopeMessage, createFeedAdmitMessage, createKeyAdmitMessage, createPartyGenesisMessage, Keyring, KeyType } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { codec } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { createStorage, STORAGE_RAM } from '@dxos/random-access-multi-storage';
import { afterTest } from '@dxos/testutils';

import { MetadataStore } from '../metadata';
import { PartyFeedProvider, ReplicatorProtocolPluginFactory } from '../pipeline';
import { SnapshotStore } from '../snapshots';
import { createRamStorage } from '../util';
import { PartyCore } from './party-core';
import { Protocol } from '@dxos/mesh-protocol';
import { promiseTimeout } from '@dxos/async';

describe('PartyCore', () => {
  const createParty = async () => {
    const storage = createStorage('', STORAGE_RAM);
    const feedStore = new FeedStore(storage, { valueEncoding: codec });
    afterTest(async () => feedStore.close());

    const keyring = new Keyring();

    const metadataStore = new MetadataStore(createRamStorage());

    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const snapshotStore = new SnapshotStore(createStorage('', STORAGE_RAM));

    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });

    const partyFeedProvider = new PartyFeedProvider(metadataStore, keyring, feedStore, partyKey.publicKey);

    const party = new PartyCore(
      partyKey.publicKey,
      partyFeedProvider,
      modelFactory,
      snapshotStore,
      PublicKey.random()
    );

    const feed = await partyFeedProvider.createOrOpenDataFeed();
    await party.open();
    afterTest(async () => party.close());

    // PartyGenesis (self-signed by Party).
    await party.processor.writeHaloMessage(createPartyGenesisMessage(
      keyring,
      partyKey,
      feed.key,
      partyKey
    ));

    // FeedAdmit (signed by the Device KeyChain).
    await party.processor.writeHaloMessage(createFeedAdmitMessage(
      keyring,
      partyKey.publicKey,
      feed.key,
      [partyKey]
    ));

    return { party, feedKey: feed.key, feed, feedStore, keyring, partyKey, partyFeedProvider };
  };

  test('create & have the feed key admitted', async () => {
    const { party, feedKey } = await createParty();

    await party.processor.keyOrInfoAdded.waitForCount(1);

    expect(party.processor.isFeedAdmitted(feedKey)).toBeTruthy();
  });

  test('create item', async () => {
    const { party } = await createParty();

    const item = await party.database.createItem({ model: ObjectModel });
    await item.model.set('foo', 'bar');

    expect(item.model.get('foo')).toEqual('bar');
  });

  test('create item with parent and then reload', async () => {
    const { party } = await createParty();

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
    const { party, partyKey, keyring, partyFeedProvider, feedStore } = await createParty();

    const feedKey = await keyring.createKeyRecord({ type: KeyType.FEED });
    await party.processor.writeHaloMessage(createFeedAdmitMessage(
      keyring,
      party.key,
      feedKey.publicKey,
      [partyKey]
    ));

    await feedStore.feedOpenedEvent.waitForCount(1)

    expect(partyFeedProvider.getFeedKeys().some(k => k.equals(feedKey.publicKey))).toEqual(true)
  })

  test.skip('two instances replicating', async () => {
    const peer1 = await createParty();

    const storage = createStorage('', STORAGE_RAM);
    const feedStore = new FeedStore(storage, { valueEncoding: codec });
    afterTest(async () => feedStore.close());

    const metadataStore = new MetadataStore(createRamStorage());

    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const snapshotStore = new SnapshotStore(createStorage('', STORAGE_RAM));

    const partyFeedProvider = new PartyFeedProvider(metadataStore, peer1.keyring, feedStore, peer1.party.key);

    const party2 = new PartyCore(
      peer1.party.key,
      partyFeedProvider,
      modelFactory,
      snapshotStore,
      PublicKey.random()
    );

    const feed2 = await partyFeedProvider.createOrOpenDataFeed();
    await party2.open();
    afterTest(async () => party2.close());
    
    await peer1.party.processor.writeHaloMessage(createFeedAdmitMessage(
      peer1.keyring,
      peer1.party.key,
      feed2.key,
      [peer1.partyKey]
    ));

    const protocol1 = new Protocol({
      discoveryKey: peer1.party.key.asBuffer(),
      initiator: true,
      streamOptions: {
        live: true
      },
      userSession: { peerId: 'user1' }
    }).setExtensions(
      new ReplicatorProtocolPluginFactory(peer1.partyFeedProvider).createPlugins().map(r => r.createExtension())
    ).init()
    const protocol2 = new Protocol({
      discoveryKey: peer1.party.key.asBuffer(),
      initiator: false,
      streamOptions: {
        live: true
      },
      userSession: { peerId: 'user2' }
    }).setExtensions(
      new ReplicatorProtocolPluginFactory(partyFeedProvider).createPlugins().map(r => r.createExtension())
    ).init()

    protocol1.stream.pipe(protocol2.stream).pipe(protocol1.stream)

    await peer1.party.open();
    await party2.open([{
      publicKey: peer1.feedKey,
      type: KeyType.FEED,
    }]);

    const item1 = await peer1.party.database.createItem();
    await promiseTimeout(party2.database.waitForItem({ id: item1.id }), 1000, new Error('timeout'));
  })
});
