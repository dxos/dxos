//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import pify from 'pify';
import ram from 'random-access-memory';

import { waitForCondition } from '@dxos/async';
import { createFeedAdmitMessage, createPartyGenesisMessage, Keyring, KeyType } from '@dxos/credentials';
import { createId, humanize } from '@dxos/crypto';
import { ModelFactory } from '@dxos/experimental-model-factory';
import { ObjectModel } from '@dxos/experimental-object-model';
import { createLoggingTransform, latch, jsonReplacer } from '@dxos/experimental-util';
import { FeedStore } from '@dxos/feed-store';
import { NetworkManager, SwarmProvider } from '@dxos/network-manager';

import { codec } from './codec';
import { Database } from './database';
import { FeedStoreAdapter } from './feed-store-adapter';
import { IdentityManager, PartyManager } from './parties';
import { PartyFactory } from './parties/party-factory';

const log = debug('dxos:echo:database:test,dxos:*:error');

const createDatabase = async (verbose = true) => {
  const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
  const feedStoreAdapter = new FeedStoreAdapter(feedStore);

  let identityManager;
  {
    const keyring = new Keyring();
    await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    identityManager = new IdentityManager(keyring);
  }

  const modelFactory = new ModelFactory()
    .registerModel(ObjectModel.meta, ObjectModel);

  const options = verbose ? {
    readLogger: createLoggingTransform((message: any) => { log('>>>', JSON.stringify(message, jsonReplacer, 2)); }),
    writeLogger: createLoggingTransform((message: any) => { log('<<<', JSON.stringify(message, jsonReplacer, 2)); })
  } : undefined;

  const partyFactory = new PartyFactory(identityManager.keyring, feedStoreAdapter, modelFactory, new NetworkManager(feedStore, new SwarmProvider()));
  const partyManager = new PartyManager(identityManager, feedStoreAdapter, partyFactory);

  await partyManager.open();
  await partyManager.createHalo();

  return new Database(partyManager, options);
};

describe('api tests', () => {
  test('create party and update properties.', async () => {
    const db = await createDatabase();
    await db.open();

    const parties = await db.queryParties({ open: true });
    log('Parties:', parties.value.map(party => humanize(party.key)));
    expect(parties.value).toHaveLength(0);

    const [updated, onUpdate] = latch();
    const unsubscribe = parties.subscribe(async parties => {
      log('Updated:', parties.map(party => humanize(party.key)));
      expect(parties).toHaveLength(1);
      parties.map(async party => {
        const value = await party.getProperty('title');
        expect(value).toBe('DXOS');
        onUpdate();
      });
    });

    const party = await db.createParty();
    expect(party.isOpen).toBeTruthy();
    await party.setProperty('title', 'DXOS');

    await updated;
    unsubscribe();
  });

  test('create party and items.', async () => {
    const db = await createDatabase();
    await db.open();

    const parties = await db.queryParties({ open: true });
    log('Parties:', parties.value.map(party => humanize(party.key)));
    expect(parties.value).toHaveLength(0);

    const [updated, onUpdate] = latch();
    const unsubscribe = parties.subscribe(async parties => {
      log('Updated:', parties.map(party => humanize(party.key)));

      // TODO(burdon): Update currentybly called after all mutations below have completed?
      expect(parties).toHaveLength(1);
      parties.map(async party => {
        const items = await party.queryItems();
        items.value.forEach(item => {
          log('Item:', String(item));
        });

        // TODO(burdon): Check item mutations.
        const result = await party.queryItems({ type: 'wrn://dxos.org/item/document' });
        expect(result.value).toHaveLength(2);
        onUpdate();
      });
    });

    const party = await db.createParty();
    expect(party.isOpen).toBeTruthy();

    // TODO(burdon): Test item mutations.
    await party.createItem(ObjectModel, 'wrn://dxos.org/item/document');
    await party.createItem(ObjectModel, 'wrn://dxos.org/item/document');
    await party.createItem(ObjectModel, 'wrn://dxos.org/item/kanban');

    await updated;
    unsubscribe();
  });

  test('create party and item with child item.', async () => {
    const db = await createDatabase();
    await db.open();

    const parties = await db.queryParties({ open: true });
    log('Parties:', parties.value.map(party => humanize(party.key)));
    expect(parties.value).toHaveLength(0);

    const [updated, onUpdate] = latch();
    const unsubscribe = parties.subscribe(async parties => {
      log('Updated:', parties.map(party => humanize(party.key)));

      expect(parties).toHaveLength(1);
      parties.map(async party => {
        const items = await party.queryItems();
        items.value.forEach(item => {
          log('Item:', String(item));
        });

        const { first: item } = await party.queryItems({ type: 'wrn://dxos.org/item/document' });
        expect(item.children).toHaveLength(1);
        expect(item.children[0].type).toBe(undefined);
        // TODO(burdon): Test parent.
        onUpdate();
      });
    });

    const party = await db.createParty();
    expect(party.isOpen).toBeTruthy();

    const parent = await party.createItem(ObjectModel, 'wrn://dxos.org/item/document');
    const child = await party.createItem(ObjectModel);
    await child.setParent(parent.id);

    await updated;
    unsubscribe();
  });

  test('cold start from replicated party', async () => {
    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
    const feedStoreAdapter = new FeedStoreAdapter(feedStore);
    await feedStoreAdapter.open();

    const keyring = new Keyring();
    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });

    const writableFeed = await feedStoreAdapter.createWritableFeed(partyKey.publicKey);
    const writableFeedKey = await keyring.addKeyRecord({
      publicKey: writableFeed.key,
      secretKey: writableFeed.secretKey,
      type: KeyType.FEED
    });
    const genesisFeed = await feedStore.openFeed(createId(), { metadata: { partyKey: partyKey.publicKey } } as any);
    const genesisFeedKey = await keyring.addKeyRecord({
      publicKey: genesisFeed.key,
      secretKey: genesisFeed.secretKey, // needed for party genesis message
      type: KeyType.FEED
    });

    const writeToGenesisFeed = pify(genesisFeed.append.bind(genesisFeed));

    await writeToGenesisFeed({ halo: createPartyGenesisMessage(keyring, partyKey, genesisFeedKey, identityKey) });
    await writeToGenesisFeed({ halo: createFeedAdmitMessage(keyring, partyKey.publicKey, writableFeedKey, [identityKey]) });
    await writeToGenesisFeed({
      echo: {
        itemId: createId(),
        genesis: {
          modelType: ObjectModel.meta.type
        }
      }
    });

    log('Initializing database');
    const modelFactory = new ModelFactory()
      .registerModel(ObjectModel.meta, ObjectModel);

    const identityManager = new IdentityManager(keyring);
    const partyFactory = new PartyFactory(identityManager.keyring, feedStoreAdapter, modelFactory, new NetworkManager(feedStore, new SwarmProvider()));
    const partyManager = new PartyManager(identityManager, feedStoreAdapter, partyFactory);

    await partyManager.open();
    await partyManager.createHalo();
    expect(identityManager.halo).toBeTruthy();

    const database = new Database(partyManager);

    await waitForCondition(async () => (await database.getParty(partyKey.publicKey)) !== undefined);
    const party = await database.getParty(partyKey.publicKey);
    assert(party);
    log('Initialized party');

    const items = await party.queryItems();
    await waitForCondition(() => items.value.length > 0);
  });
});
