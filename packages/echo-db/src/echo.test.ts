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
import { codec } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager, SwarmProvider } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { latch, jsonReplacer } from '@dxos/util';

import { ECHO } from './echo';
import { FeedStoreAdapter } from './feed-store-adapter';
import { IdentityManager, PartyManager } from './parties';
import { PartyFactory } from './parties/party-factory';

const log = debug('dxos:echo:database:test,dxos:*:error');

const createECHO = async (verbose = true) => {
  const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
  const feedStoreAdapter = new FeedStoreAdapter(feedStore);

  let identityManager;
  {
    const keyring = new Keyring();
    await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    identityManager = new IdentityManager(keyring);
  }

  const modelFactory = new ModelFactory()
    .registerModel(ObjectModel);

  const options = verbose ? {
    readLogger: (message: any) => { log('>>>', JSON.stringify(message, jsonReplacer, 2)); },
    writeLogger: (message: any) => { log('<<<', JSON.stringify(message, jsonReplacer, 2)); }
  } : undefined;

  const partyFactory = new PartyFactory(identityManager, feedStoreAdapter, modelFactory, new NetworkManager(feedStore, new SwarmProvider()), options);
  const partyManager = new PartyManager(identityManager, feedStoreAdapter, partyFactory);

  await partyManager.open();
  await partyManager.createHalo({ identityDisplayName: humanize(identityManager.identityKey.publicKey) });

  return new ECHO(partyManager, options);
};

describe('api tests', () => {
  test('create party and update properties.', async () => {
    const echo = await createECHO();
    await echo.open();

    const parties = await echo.queryParties({ open: true });
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

    const party = await echo.createParty();
    expect(party.isOpen).toBeTruthy();
    await party.setProperty('title', 'DXOS');

    await updated;
    unsubscribe();
  });

  test('create party and items.', async () => {
    const echo = await createECHO();
    await echo.open();

    const parties = await echo.queryParties({ open: true });
    log('Parties:', parties.value.map(party => humanize(party.key)));
    expect(parties.value).toHaveLength(0);

    const [updated, onUpdate] = latch();
    const unsubscribe = parties.subscribe(async parties => {
      log('Updated:', parties.map(party => humanize(party.key)));

      // TODO(burdon): Update currentybly called after all mutations below have completed?
      expect(parties).toHaveLength(1);
      parties.map(async party => {
        const items = await party.database.queryItems();
        items.value.forEach(item => {
          log('Item:', String(item));
        });

        // TODO(burdon): Check item mutations.
        const result = await party.database.queryItems({ type: 'wrn://dxos.org/item/document' });
        expect(result.value).toHaveLength(2);
        onUpdate();
      });
    });

    const party = await echo.createParty();
    expect(party.isOpen).toBeTruthy();

    const members = party.queryMembers().value;
    expect(members.length).toBe(1);
    // Within this test, we use the humanized key as the name.
    expect(members[0].displayName).toEqual(humanize(members[0].publicKey));

    // TODO(burdon): Test item mutations.
    await party.database.createItem({ model: ObjectModel, type: 'wrn://dxos.org/item/document' });
    await party.database.createItem({ model: ObjectModel, type: 'wrn://dxos.org/item/document' });
    await party.database.createItem({ model: ObjectModel, type: 'wrn://dxos.org/item/kanban' });

    await updated;
    unsubscribe();
  });

  test('create party and item with child item.', async () => {
    const echo = await createECHO();
    await echo.open();

    const parties = await echo.queryParties({ open: true });
    log('Parties:', parties.value.map(party => humanize(party.key)));
    expect(parties.value).toHaveLength(0);

    const [updated, onUpdate] = latch();
    const unsubscribe = parties.subscribe(async parties => {
      log('Updated:', parties.map(party => humanize(party.key)));

      expect(parties).toHaveLength(1);
      parties.map(async party => {
        const items = await party.database.queryItems();
        items.value.forEach(item => {
          log('Item:', String(item));
        });

        const { first: item } = await party.database.queryItems({ type: 'wrn://dxos.org/item/document' });
        expect(item.children).toHaveLength(1);
        expect(item.children[0].type).toBe(undefined);
        // TODO(burdon): Test parent.
        onUpdate();
      });
    });

    const party = await echo.createParty();
    expect(party.isOpen).toBeTruthy();

    const members = party.queryMembers().value;
    expect(members.length).toBe(1);
    // Within this test, we use the humanized key as the name.
    expect(members[0].displayName).toEqual(humanize(members[0].publicKey));

    const parent = await party.database.createItem({ model: ObjectModel, type: 'wrn://dxos.org/item/document' });
    await party.database.createItem({ model: ObjectModel, parrent: parent.id });

    await updated;
    unsubscribe();
  });

  test('create party, two items with child items, and then move child.', async () => {
    const echo = await createECHO();
    await echo.open();

    const parties = await echo.queryParties({ open: true });
    log('Parties:', parties.value.map(party => humanize(party.key)));
    expect(parties.value).toHaveLength(0);

    const party = await echo.createParty();
    expect(party.isOpen).toBeTruthy();

    const members = party.queryMembers().value;
    expect(members.length).toBe(1);
    // Within this test, we use the humanized key as the name.
    expect(members[0].displayName).toEqual(humanize(members[0].publicKey));

    const parentA = await party.database.createItem({ model: ObjectModel, type: 'wrn://dxos.org/item/document' });
    const childA = await party.database.createItem({ model: ObjectModel, parrent: parentA.id });
    expect(parentA.children).toHaveLength(1);
    expect(parentA.children[0].id).toEqual(childA.id);

    const parentB = await party.database.createItem({ model: ObjectModel, type: 'wrn://dxos.org/item/document' });
    const childB = await party.database.createItem({ model: ObjectModel, parrent: parentB.id });
    expect(parentB.children).toHaveLength(1);
    expect(parentB.children[0].id).toEqual(childB.id);

    await childB.setParent(parentA.id);
    expect(parentA.children).toHaveLength(2);
    expect(parentA.children[0].id).toEqual(childA.id);
    expect(parentA.children[1].id).toEqual(childB.id);
    expect(parentB.children).toHaveLength(0);
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
      .registerModel(ObjectModel);

    const identityManager = new IdentityManager(keyring);
    const partyFactory = new PartyFactory(identityManager, feedStoreAdapter, modelFactory, new NetworkManager(feedStore, new SwarmProvider()));
    const partyManager = new PartyManager(identityManager, feedStoreAdapter, partyFactory);

    await partyManager.open();
    await partyManager.createHalo();
    expect(identityManager.halo).toBeTruthy();

    const database = new ECHO(partyManager);

    await waitForCondition(async () => (await database.getParty(partyKey.publicKey)) !== undefined);
    const party = await database.getParty(partyKey.publicKey);
    assert(party);
    log('Initialized party');

    const items = await party.database.queryItems();
    await waitForCondition(() => items.value.length > 0);
  });

  test('create party and items with props', async () => {
    const echo = await createECHO();
    await echo.open();

    const party = await echo.createParty();

    const item = await party.database.createItem({ model: ObjectModel, props: { foo: 'bar', baz: 123 } });

    expect(item.model.getProperty('foo')).toEqual('bar');
    expect(item.model.getProperty('baz')).toEqual(123);
  });
});
