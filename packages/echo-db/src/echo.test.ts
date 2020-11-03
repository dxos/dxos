//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import pify from 'pify';

import { waitForCondition } from '@dxos/async';
import { createFeedAdmitMessage, createPartyGenesisMessage, KeyType } from '@dxos/credentials';
import { createId, humanize } from '@dxos/crypto';
import { Timeframe } from '@dxos/echo-protocol';
import { ObjectModel } from '@dxos/object-model';
import { latch } from '@dxos/util';

import { SecretProvider, SecretValidator } from './invitations';
import { createTestInstance } from './testing';

const log = debug('dxos:echo:database:test,dxos:*:error');

const createECHO = async (verbose = true) => {
  const { echo } = await createTestInstance({ verboseLogging: verbose, initialized: true });
  return echo;
};

describe('api tests', () => {
  test('create party and update properties.', async () => {
    const echo = await createECHO();

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
    await party.database.createItem({ model: ObjectModel, parent: parent.id });

    await updated;
    unsubscribe();
  });

  test('create party, two items with child items, and then move child.', async () => {
    const echo = await createECHO();

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
    const childA = await party.database.createItem({ model: ObjectModel, parent: parentA.id });
    expect(parentA.children).toHaveLength(1);
    expect(parentA.children[0].id).toEqual(childA.id);

    const parentB = await party.database.createItem({ model: ObjectModel, type: 'wrn://dxos.org/item/document' });
    const childB = await party.database.createItem({ model: ObjectModel, parent: parentB.id });
    expect(parentB.children).toHaveLength(1);
    expect(parentB.children[0].id).toEqual(childB.id);

    await childB.setParent(parentA.id);
    expect(parentA.children).toHaveLength(2);
    expect(parentA.children[0].id).toEqual(childA.id);
    expect(parentA.children[1].id).toEqual(childB.id);
    expect(parentB.children).toHaveLength(0);
  });

  test('cold start from replicated party', async () => {
    const { echo, partyManager, feedStoreAdapter, identityManager } = await createTestInstance();
    await feedStoreAdapter.open();

    const identityKey = await identityManager.keyring.createKeyRecord({ type: KeyType.IDENTITY });
    await identityManager.keyring.createKeyRecord({ type: KeyType.DEVICE });
    const partyKey = await identityManager.keyring.createKeyRecord({ type: KeyType.PARTY });

    const writableFeed = await feedStoreAdapter.createWritableFeed(partyKey.publicKey);
    const writableFeedKey = await identityManager.keyring.addKeyRecord({
      publicKey: writableFeed.key,
      secretKey: writableFeed.secretKey,
      type: KeyType.FEED
    });
    const genesisFeed = await feedStoreAdapter.feedStore.openFeed(createId(), { metadata: { partyKey: partyKey.publicKey } } as any);
    const genesisFeedKey = await identityManager.keyring.addKeyRecord({
      publicKey: genesisFeed.key,
      secretKey: genesisFeed.secretKey, // needed for party genesis message
      type: KeyType.FEED
    });

    const writeToGenesisFeed = pify(genesisFeed.append.bind(genesisFeed));

    await writeToGenesisFeed({ halo: createPartyGenesisMessage(identityManager.keyring, partyKey, genesisFeedKey, identityKey) });
    await writeToGenesisFeed({ halo: createFeedAdmitMessage(identityManager.keyring, partyKey.publicKey, writableFeedKey, [identityKey]) });
    await writeToGenesisFeed({
      echo: {
        itemId: createId(),
        timeframe: new Timeframe(),
        genesis: {
          modelType: ObjectModel.meta.type
        }
      }
    });

    log('Initializing database');

    await partyManager.open();
    await partyManager.createHalo();
    expect(identityManager.halo).toBeTruthy();

    await waitForCondition(async () => (await echo.getParty(partyKey.publicKey)) !== undefined);
    const party = await echo.getParty(partyKey.publicKey);
    assert(party);
    log('Initialized party');

    const items = await party.database.queryItems();
    await waitForCondition(() => items.value.length > 0);
  });

  test('create party and items with props', async () => {
    const echo = await createECHO();

    const party = await echo.createParty();

    const item = await party.database.createItem({ model: ObjectModel, props: { foo: 'bar', baz: 123 } });

    expect(item.model.getProperty('foo')).toEqual('bar');
    expect(item.model.getProperty('baz')).toEqual(123);
  });

  test('Contacts', async () => {
    const echoA = await createECHO();
    const echoB = await createECHO();

    const partyA = await echoA.createParty();

    const PIN = Buffer.from('0000');

    // Create a validation function which tests the signature of a specific KeyPair.
    const secretValidator: SecretValidator = async (invitation, secret) => secret.equals(PIN);

    // And a provider for the secret.
    // (We reuse the function here, but normally both the Inviter and Invitee would have their own SecretProvider.)
    const secretProvider: SecretProvider = async () => PIN;

    // Issue the invitation to the Party on A.
    const invitationDescriptor = await partyA.createInvitation({ secretProvider, secretValidator });

    const [updatedA, onUpdateA] = latch();
    const [updatedB, onUpdateB] = latch();

    echoA.queryContacts().subscribe((value) => {
      if (value && value.length) {
        onUpdateA();
      }
    });

    echoB.queryContacts().subscribe((value) => {
      if (value && value.length) {
        onUpdateB();
      }
    });

    // Redeem the invitation on B.
    await echoB.joinParty(invitationDescriptor, secretProvider);

    await updatedA;
    await updatedB;

    expect(echoA.queryContacts().value.length).toBe(1);
    expect(echoB.queryContacts().value.length).toBe(1);
  });
});
