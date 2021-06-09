//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import expect from 'expect';
import { it as test } from 'mocha';

import { latch, sleep, waitForCondition } from '@dxos/async';
import { SecretValidator, SecretProvider, testSecretProvider, testSecretValidator, generateSeedPhrase, keyPairFromSeedPhrase } from '@dxos/credentials';
import { createKeyPair } from '@dxos/crypto';
import { ObjectModel } from '@dxos/object-model';
import { afterTest } from '@dxos/testutils';
import { arraysEqual } from '@dxos/util';

import { ECHO } from './echo';
import { OfflineInvitationClaimer, testInvitationAuthenticator } from './invitations';
import { Item } from './items';
import { inviteTestPeer } from './util';

const log = debug('dxos:echo:test');

describe('ECHO', () => {
  const setup = async (createProfile: boolean) => {
    const echo = new ECHO();

    await echo.open();
    afterTest(() => echo.close());

    if (createProfile) {
      await echo.createIdentity(createKeyPair());
      await echo.createHalo();
    }

    return echo;
  };

  test('create party and update properties.', async () => {
    const echo = await setup(true);
    const parties = await echo.queryParties({ open: true });
    log('Parties:', parties.value.map(party => party.key.humanize()));
    expect(parties.value).toHaveLength(0);

    const party = await echo.createParty();
    expect(party.isOpen).toBeTruthy();
    await party.setTitle('DXOS');
    expect(party.title).toBe('DXOS');
  });

  test('create party and items.', async () => {
    const echo = await setup(true);
    const parties = await echo.queryParties({ open: true });
    log('Parties:', parties.value.map(party => party.key.humanize()));
    expect(parties.value).toHaveLength(0);

    const [updated, onUpdate] = latch();
    const unsubscribe = parties.subscribe(async parties => {
      log('Updated:', parties.map(party => party.key.humanize()));

      // TODO(burdon): Update currentybly called after all mutations below have completed?
      expect(parties).toHaveLength(1);
      parties.map(async party => {
        const items = await party.database.queryItems();
        items.value.forEach(item => {
          log('Item:', String(item));
        });

        // TODO(burdon): Check item mutations.
        const result = await party.database.queryItems({ type: 'dxn://dxos/item/document' });
        expect(result.value).toHaveLength(2);
        onUpdate();
      });
    });

    const party = await echo.createParty();
    expect(party.isOpen).toBeTruthy();

    const members = party.queryMembers().value;
    expect(members.length).toBe(1);
    // Within this test, we use the humanized key as the name.
    expect(members[0].displayName).toEqual(members[0].publicKey.humanize());

    // TODO(burdon): Test item mutations.
    await party.database.createItem({ model: ObjectModel, type: 'dxn://dxos/item/document' });
    await party.database.createItem({ model: ObjectModel, type: 'dxn://dxos/item/document' });
    await party.database.createItem({ model: ObjectModel, type: 'dxn://dxos/item/kanban' });

    await updated;
    unsubscribe();
  });

  test('create party and item with child item.', async () => {
    const echo = await setup(true);

    const parties = await echo.queryParties({ open: true });
    log('Parties:', parties.value.map(party => party.key.humanize()));
    expect(parties.value).toHaveLength(0);

    const [updated, onUpdate] = latch();
    const unsubscribe = parties.subscribe(async parties => {
      log('Updated:', parties.map(party => party.key.humanize()));

      expect(parties).toHaveLength(1);
      parties.map(async party => {
        const items = await party.database.queryItems();
        items.value.forEach(item => {
          log('Item:', String(item));
        });

        const { first: item } = await party.database.queryItems({ type: 'dxn://dxos/item/document' });
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
    expect(members[0].displayName).toEqual(members[0].publicKey.humanize());

    const parent = await party.database.createItem({ model: ObjectModel, type: 'dxn://dxos/item/document' });
    await party.database.createItem({ model: ObjectModel, parent: parent.id });

    await updated;
    unsubscribe();
  });

  test('create party, two items with child items, and then move child.', async () => {
    const echo = await setup(true);

    const parties = await echo.queryParties({ open: true });
    log('Parties:', parties.value.map(party => party.key.humanize()));
    expect(parties.value).toHaveLength(0);

    const party = await echo.createParty();
    expect(party.isOpen).toBeTruthy();

    const members = party.queryMembers().value;
    expect(members.length).toBe(1);
    // Within this test, we use the humanized key as the name.
    expect(members[0].displayName).toEqual(members[0].publicKey.humanize());

    const parentA = await party.database.createItem({ model: ObjectModel, type: 'dxn://dxos/item/document' });
    const childA = await party.database.createItem({ model: ObjectModel, parent: parentA.id });
    expect(parentA.children).toHaveLength(1);
    expect(parentA.children[0].id).toEqual(childA.id);

    const parentB = await party.database.createItem({ model: ObjectModel, type: 'dxn://dxos/item/document' });
    const childB = await party.database.createItem({ model: ObjectModel, parent: parentB.id });
    expect(parentB.children).toHaveLength(1);
    expect(parentB.children[0].id).toEqual(childB.id);

    await childB.setParent(parentA.id);
    expect(parentA.children).toHaveLength(2);
    expect(parentA.children[0].id).toEqual(childA.id);
    expect(parentA.children[1].id).toEqual(childB.id);
    expect(parentB.children).toHaveLength(0);
  });

  test('cold start with party', async () => {
    const echo = await setup(true);
    const party = await echo.createParty();

    await echo.close();
    await echo.open();

    await waitForCondition(async () => (await echo.getParty(party.key)) !== undefined);
    const party2 = await echo.getParty(party.key)!;

    expect(party2.key).toEqual(party.key);
    expect(party2.isOpen).toBe(true);
  }).timeout(10_000);

  test('cold start from replicated party', async () => {
    const echo1 = await setup(true);
    const echo2 = await setup(true);

    const party1 = await echo1.createParty();
    await inviteTestPeer(party1, echo2);

    await sleep(1000); // TODO(marik-d): Figure out why this is needed.

    await echo1.close();
    await echo2.close();

    await echo2.open();
    await waitForCondition(async () => (await echo2.getParty(party1.key)) !== undefined);

    const party = await echo2.getParty(party1.key);
    assert(party);
    log('Initialized party');

    const items = await party.database.queryItems();
    await waitForCondition(() => items.value.length > 0);
    expect(items.value.length).toBeGreaterThan(0);
  });

  test('create party and items with props', async () => {
    const echo = await setup(true);

    const party = await echo.createParty();

    const item = await party.database.createItem({ model: ObjectModel, props: { foo: 'bar', baz: 123 } });

    expect(item.model.getProperty('foo')).toEqual('bar');
    expect(item.model.getProperty('baz')).toEqual(123);
  });

  test('open and close', async () => {
    const echo = new ECHO();
    expect(echo.isOpen).toBe(false);
    await echo.open();
    expect(echo.isOpen).toBe(true);
    await echo.close();
    expect(echo.isOpen).toBe(false);
  });

  test('open and create profile', async () => {
    const echo = new ECHO();
    await echo.open();
    await echo.createIdentity(createKeyPair());
    await echo.createHalo();
    expect(echo.identityKey).toBeDefined();
  });

  test('close and open again', async () => {
    const echo = new ECHO();
    await echo.open();
    await echo.createIdentity(createKeyPair());
    await echo.createHalo();
    expect(echo.identityKey).toBeDefined();
    await echo.close();

    await echo.open();
    expect(echo.isOpen).toBe(true);
    expect(echo.identityKey).toBeDefined();
  });

  test('cant create party on closed echo', async () => {
    const echo = new ECHO();

    await expect(() => echo.createParty()).rejects.toBeDefined();
  });

  test('reset', async () => {
    const echo = new ECHO();
    await echo.open();
    await echo.createIdentity(createKeyPair());
    await echo.createHalo();
    expect(echo.identityKey).toBeDefined();

    return echo.reset();
  });

  test('One user, two devices', async () => {
    const a = await setup(true);
    const b = await setup(false);

    expect(a.isHaloInitialized).toEqual(true);
    expect(b.isHaloInitialized).toEqual(false);

    expect(a.queryParties().value.length).toBe(0);
    await a.createParty();
    expect(a.queryParties().value.length).toBe(1);

    // Issue the invitation on nodeA.
    const invitation = await a.createHaloInvitation({ secretValidator: testSecretValidator, secretProvider: testSecretProvider });

    // Should not have any parties.
    expect(b.queryParties().value.length).toBe(0);

    // And then redeem it on nodeB.
    await b.joinHalo(invitation, testSecretProvider);
    expect(a.isHaloInitialized).toEqual(true);
    expect(b.isHaloInitialized).toEqual(true);

    // Check the initial party is opened.
    await waitForCondition(() => b.queryParties().value.length === 1, 1000);

    const partyA = a.queryParties().value[0];
    await partyA.open();
    const partyB = b.queryParties().value[0];
    await partyB.open();

    {
      let itemA: Item<any> | null = null;

      // Subscribe to Item updates on B.
      const updated = partyB.database.queryItems({ type: 'dxn://example/item/test' })
        .update.waitFor(items => !!itemA && !!items.find(item => item.id === itemA?.id));

      // Create a new Item on A.
      itemA = await partyA.database
        .createItem({ model: ObjectModel, type: 'dxn://example/item/test' }) as Item<any>;
      log(`A created ${itemA.id}`);

      // Now wait to see it on B.
      await updated;
      log(`B has ${itemA.id}`);
    }

    const partyUpdated = b.queryParties().update.waitForCount(1);

    // Now create a Party on A and make sure it gets opened on both A and B.
    const partyA2 = await a.createParty();
    log('A a created second party');
    await partyA2.open();
    expect(a.queryParties().value.length).toBe(2);

    await partyUpdated;
    log('B has second party');
    expect(b.queryParties().value.length).toBe(2);
    expect(a.queryParties().value[0].key).toEqual(b.queryParties().value[0].key);
    expect(a.queryParties().value[1].key).toEqual(b.queryParties().value[1].key);
  }).timeout(10_000);

  test('Two users, two devices each', async () => {
    const a1 = await setup(true);
    const a2 = await setup(false);
    const b1 = await setup(true);
    const b2 = await setup(false);

    expect(a1.isHaloInitialized).toBeTruthy();
    expect(a2.isHaloInitialized).toBeFalsy();

    expect(b1.isHaloInitialized).toBeTruthy();
    expect(b2.isHaloInitialized).toBeFalsy();

    await Promise.all([
      (async () => {
        // Issue the invitation on nodeA.
        const invitation = await a1.createHaloInvitation(testInvitationAuthenticator);

        // And then redeem it on nodeB.
        await a2.joinHalo(invitation, testSecretProvider);
      })(),
      (async () => {
        // Issue the invitation on nodeA.
        const invitation = await b1.createHaloInvitation(testInvitationAuthenticator);

        // And then redeem it on nodeB.
        await b2.joinHalo(invitation, testSecretProvider);
      })()
    ]);

    // Now create a Party on 1 and make sure it gets opened on both 1 and 2.
    let partyA;
    {
      expect(a1.queryParties().value.length).toBe(0);
      expect(a2.queryParties().value.length).toBe(0);

      const [partyUpdatedA, onPartyUpdateA] = latch();
      a2.queryParties().update.on(onPartyUpdateA);

      partyA = await a1.createParty();
      await partyUpdatedA;

      expect(a1.queryParties().value.length).toBe(1);
      expect(a2.queryParties().value.length).toBe(1);
      expect(a1.queryParties().value[0].key).toEqual(a2.queryParties().value[0].key);
    }

    // Invite B to join the Party.
    {
      expect(b1.queryParties().value.length).toBe(0);
      expect(b2.queryParties().value.length).toBe(0);

      const [partyUpdatedB, onPartyUpdateB] = latch();
      b2.queryParties().update.on(onPartyUpdateB);

      const invitation = await partyA.createInvitation(testInvitationAuthenticator);
      await b1.joinParty(invitation, testSecretProvider);

      await partyUpdatedB;
      expect(b1.queryParties().value.length).toBe(1);
      expect(b2.queryParties().value.length).toBe(1);
      expect(b1.queryParties().value[0].key).toEqual(b2.queryParties().value[0].key);

      // A and B now both belong to the Party
      expect(a1.queryParties().value[0].key).toEqual(b1.queryParties().value[0].key);
    }

    // Empty across the board.
    for (const node of [a1, a2, b1, b2]) {
      const [party] = node.queryParties().value;
      expect(party.database.queryItems({ type: 'dxn://example/item/test' }).value.length).toBe(0);
    }

    for await (const node of [a1, a2, b1, b2]) {
      let item: Item<any> | null = null;
      const [party] = node.queryParties().value;
      const itemPromises = [];

      for (const otherNode of [a1, a2, b1, b2].filter(x => x !== node)) {
        const [otherParty] = otherNode.queryParties().value;
        const [updated, onUpdate] = latch();
        otherParty.database.queryItems({ type: 'dxn://example/item/test' })
          .subscribe((result) => {
            if (result.find(current => current.id === item?.id)) {
              log(`other has ${item?.id}`);
              onUpdate();
            }
          });
        itemPromises.push(updated);
      }

      item = await party.database.createItem({ model: ObjectModel, type: 'dxn://example/item/test' }) as Item<any>;
      await Promise.all(itemPromises);
    }
  }).timeout(20_000);

  // TODO(marik-d): Move to ECHO tests.
  test('Join new device to HALO by recovering from identity seed phrase', async () => {
    const a = new ECHO();
    await a.open();
    afterTest(() => a.close());

    const seedPhrase = generateSeedPhrase();
    await a.createIdentity(keyPairFromSeedPhrase(seedPhrase));
    await a.createHalo();

    const b = await setup(false);

    expect(a.isHaloInitialized).toBeTruthy();
    expect(b.isHaloInitialized).toBeFalsy();

    // And then redeem it on nodeB.
    await b.recoverHalo(seedPhrase);
    expect(a.isHaloInitialized).toBeTruthy();
    expect(b.isHaloInitialized).toBeTruthy();

    // Now create a Party on A and make sure it gets opened on both A and B.
    expect(a.queryParties().value.length).toBe(0);
    expect(b.queryParties().value.length).toBe(0);

    const partyUpdated = b.queryParties().update.waitForCount(1);

    await a.createParty();
    expect(a.queryParties().value.length).toBe(1);

    await partyUpdated;
    expect(b.queryParties().value.length).toBe(1);
    expect(a.queryParties().value[0].key).toEqual(b.queryParties().value[0].key);

    {
      let itemA: Item<any> | null = null;

      // Subscribe to Item updates on B.
      const updated = b.queryParties().value[0].database.queryItems({ type: 'dxn://example/item/test' })
        .update.waitFor(items => !!itemA && !!items.find(item => item.id === itemA?.id));

      // Create a new Item on A.
      itemA = await a.queryParties().value[0].database
        .createItem({ model: ObjectModel, type: 'dxn://example/item/test' }) as Item<any>;
      log(`A created ${itemA.id}`);

      // Now wait to see it on B.
      await updated;
      log(`B has ${itemA.id}`);
    }
  }).timeout(10_000);

  test('Contacts', async () => {
    const a = await setup(true);
    const b = await setup(true);

    const updatedA = a.queryContacts().update.waitFor(contacts => contacts.some(c => b.identityKey?.publicKey.equals(c.publicKey)))
    const updatedB = b.queryContacts().update.waitFor(contacts => contacts.some(c => a.identityKey?.publicKey.equals(c.publicKey)))

    // Create the Party.
    const partyA = await a.createParty();
    log(`Created ${partyA.key.toHex()}`);

    const invitationDescriptor = await partyA.createOfflineInvitation(b.identityKey!.publicKey);

    // Redeem the invitation on B.
    const partyB = await b.joinParty(invitationDescriptor);
    expect(partyB).toBeDefined();
    log(`Joined ${partyB.key.toHex()}`);

    await updatedA;
    await updatedB;

    expect(a.queryContacts().value.length).toBe(1)
    expect(b.queryContacts().value.length).toBe(1)
  });


  test('Deactivating and activating party.', async () => {
    const a = await setup(true);
    const partyA = await a.createParty();

    expect(partyA.isOpen).toBe(true);
    expect(partyA.isActive).toBe(true);

    await partyA.setTitle('A');
    expect(partyA.title).toBe('A');
    expect(partyA.getProperty('title')).toBe('A');

    await partyA.deactivate({ global: true });
    expect(partyA.isOpen).toBe(false);
    expect(partyA.isActive).toBe(false);
    expect(partyA.title).toBe('A');

    await partyA.activate({ global: true });
    expect(partyA.isOpen).toBe(true);
    expect(partyA.isActive).toBe(true);
    expect(partyA.title).toBe('A');

    await waitForCondition(() => partyA.getProperty('title') === 'A', 4000);
  });

  test('Deactivating and activating party, setting properties after', async () => {
    const a = await setup(true);
    const partyA = await a.createParty();

    expect(partyA.isOpen).toBe(true);
    expect(partyA.isActive).toBe(true);

    await partyA.setTitle('A');
    expect(partyA.title).toBe('A');

    await partyA.deactivate({ global: true });
    expect(partyA.isOpen).toBe(false);
    expect(partyA.isActive).toBe(false);
    expect(partyA.title).toBe('A');

    await partyA.activate({ global: true });
    expect(partyA.isOpen).toBe(true);
    expect(partyA.isActive).toBe(true);
    expect(partyA.title).toBe('A');

    // The party at this point is open and activate (see expects above), however setTitle seems to be hanging forever
    await partyA.setTitle('A2');
    expect(partyA.title).toBe('A2');
  });
});
