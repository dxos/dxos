//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import expect from 'expect';
import { it as test } from 'mocha';
import ram from 'random-access-memory';

import { latch } from '@dxos/async';
import {
  createPartyGenesisMessage, Keyring, KeyType,
  SecretProvider,
  SecretValidator
} from '@dxos/credentials';
import {
  createKeyPair, PublicKey,
  randomBytes,
  sign,
  SIGNATURE_LENGTH, verify
} from '@dxos/crypto';
import { checkType } from '@dxos/debug';
import { codec, EchoEnvelope, Timeframe } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { afterTest } from '@dxos/testutils';
import { createWritableFeedStream } from '@dxos/util';

import { HaloFactory, Identity, IdentityManager } from '../halo';
import { OfflineInvitationClaimer } from '../invitations';
import { Item } from '../items';
import { SnapshotStore } from '../snapshots';
import { FeedStoreAdapter, messageLogger } from '../util';
import { Party } from './party';
import { PartyFactory } from './party-factory';
import { PARTY_ITEM_TYPE } from './party-internal';
import { PartyManager } from './party-manager';

const log = debug('dxos:echo:parties:party-manager:test');

// TODO(burdon): Split up these tests.

// TODO(burdon): Close cleanly.
// This usually means that there are asynchronous operations that weren't stopped in your tests.

/**
 * @param open - Open the PartyManager
 * @param createIdentity - Create the identity key record.
 */
const setup = async () => {
  const feedStore = FeedStoreAdapter.create(ram);
  await feedStore.open();
  const keyring = new Keyring();
  const identity = await Identity.newIdentity(keyring);

  const snapshotStore = new SnapshotStore(ram);
  const modelFactory = new ModelFactory().registerModel(ObjectModel);
  const networkManager = new NetworkManager();
  const partyFactory = new PartyFactory(
    () => identity,
    networkManager,
    feedStore,
    modelFactory,
    snapshotStore,
    {
      writeLogger: messageLogger('<<<'),
      readLogger: messageLogger('>>>')
    }
  );

  const partyManager = new PartyManager(feedStore, snapshotStore, () => identity, partyFactory);
  afterTest(() => partyManager.close());

  return { feedStore, partyManager, identity };
};

describe('Party manager', () => {
  test('Created locally', async () => {
    const { partyManager, identity } = await setup();
    await partyManager.open();

    const [update, setUpdated] = latch();
    const unsubscribe = partyManager.update.on((party) => {
      log('Open:', String(party));
      unsubscribe();
      setUpdated();
    });

    const party = await partyManager.createParty();
    await party.open();
    expect(party.isOpen).toBeTruthy();

    // The Party key is an inception key, so its secret should be destroyed immediately after use.
    const partyKey = identity.keyring.getKey(party.key);
    expect(partyKey).toBeDefined();
    assert(partyKey);
    expect(identity.keyring.hasSecretKey(partyKey)).toBe(false);

    await update;
  });

  test('Created via sync', async () => {
    const { feedStore, partyManager } = await setup();
    await partyManager.open();

    const [update, setUpdated] = latch();
    const unsubscribe = partyManager.update.on((party) => {
      log('Open:', String(party));
      expect(party.isOpen).toBeTruthy();
      unsubscribe();
      setUpdated();
    });

    // Create raw party.
    const keyring = new Keyring();
    const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });

    // TODO(burdon): Create multiple feeds.
    const feed = await feedStore.feedStore.openFeed(
      partyKey.publicKey.toHex(), { metadata: { partyKey: partyKey.publicKey } } as any);
    const feedKey = await keyring.addKeyRecord({
      publicKey: PublicKey.from(feed.key),
      secretKey: feed.secretKey,
      type: KeyType.FEED
    });

    const feedStream = createWritableFeedStream(feed);
    feedStream.write(createPartyGenesisMessage(keyring, partyKey, feedKey, identityKey));

    await partyManager.addParty(partyKey.publicKey, [{
      type: KeyType.FEED,
      publicKey: feed.key
    }]);

    await update;
  });

  test('Create from cold start', async () => {
    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
    const feedStoreAdapter = new FeedStoreAdapter(feedStore);

    const keyring = new Keyring();
    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    await keyring.createKeyRecord({ type: KeyType.DEVICE });

    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const snapshotStore = new SnapshotStore(ram);
    const networkManager = new NetworkManager();
    const partyFactory: PartyFactory = new PartyFactory(() => identityManager.identity, networkManager, feedStoreAdapter, modelFactory, snapshotStore);
    const haloFactory = new HaloFactory(partyFactory, networkManager, keyring);
    const identityManager = new IdentityManager(keyring, haloFactory);
    const partyManager =
      new PartyManager(feedStoreAdapter, snapshotStore, () => identityManager.identity, partyFactory);

    await feedStore.open();

    // TODO(telackey): Injecting "raw" Parties into the feeds behind the scenes seems fishy to me, as it writes the
    // Party messages in a slightly different way than the code inside PartyFactory does, and so could easily diverge
    // from reality. Perhaps the thing to do would be to setup temporary storage, add the Parties in the usual way
    // via PartyManager/PartyFactory, close everything, and then compare the end-state after re-opening using the
    // same storage.

    // Create raw parties.
    const numParties = 3;
    for (let i = 0; i < numParties; i++) {
      const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });

      // TODO(burdon): Create multiple feeds.
      const feed = await feedStore.openFeed(
        partyKey.publicKey.toHex(), { metadata: { partyKey: partyKey.publicKey, writable: true } } as any);
      const feedKey = await keyring.addKeyRecord({
        publicKey: PublicKey.from(feed.key),
        secretKey: feed.secretKey,
        type: KeyType.FEED
      });

      const feedStream = createWritableFeedStream(feed);
      feedStream.write({ halo: createPartyGenesisMessage(keyring, partyKey, feedKey, identityKey) });
      feedStream.write({
        echo: checkType<EchoEnvelope>({
          itemId: 'foo',
          genesis: {
            itemType: PARTY_ITEM_TYPE,
            modelType: ObjectModel.meta.type
          },
          timeframe: new Timeframe()
        })
      });
    }

    // Open.
    await partyManager.open();
    expect(partyManager.parties).toHaveLength(numParties);
    await partyManager.close();
  });

  test('Create invitation', async () => {
    const { partyManager: partyManagerA } = await setup();
    const { partyManager: partyManagerB } = await setup();
    await partyManagerA.open();
    await partyManagerB.open();

    const partyA = await partyManagerA.createParty();
    const PIN = Buffer.from('0000');
    const secretProvider: SecretProvider = async () => PIN;
    const secretValidator: SecretValidator = async (invitation, secret) => secret.equals(PIN);
    const invitationDescriptor = await partyA.invitationManager.createInvitation({ secretProvider, secretValidator });

    const partyB = await partyManagerB.joinParty(invitationDescriptor, secretProvider);
    expect(partyB).toBeDefined();

    // TODO(burdon): Adding this causes the worker process to hang AND partyManger.close to throw.
    /*
    const [updated, onUpdate] = latch();
    partyB.database.queryItems({ type: 'dxn://example/item/test' })
      .subscribe((result) => {
        if (result.length) {
          const [itemB] = result;
          if (itemA && itemA.id === itemB.id) {
            log(`B has ${result[0].id}`);
            onUpdate();
          }
        }
      });
    */

    const itemA = await partyA.database.createItem({ model: ObjectModel, type: 'dxn://example/item/test' });
    log(`A created ${itemA.id}`);
    // await updated;

    // await partyManagerA.close();
    // await partyManagerB.close();
  });

  test('Join a party - PIN', async () => {
    const { partyManager: partyManagerA, identity: identityA } = await setup();
    const { partyManager: partyManagerB, identity: identityB } = await setup();
    await partyManagerA.open();
    await partyManagerB.open();

    // Create the Party.
    expect(partyManagerA.parties).toHaveLength(0);
    const partyA = await partyManagerA.createParty();
    expect(partyManagerA.parties).toHaveLength(1);
    log(`Created ${partyA.key.toHex()}`);

    // Create a validation function which tests the signature of a specific KeyPair.
    const PIN = Buffer.from('0000');
    const secretValidator: SecretValidator = async (invitation, secret) => secret.equals(PIN);

    // And a provider for the secret.
    // (We reuse the function here, but normally both the Inviter and Invitee would have their own SecretProvider.)
    const secretProvider: SecretProvider = async () => PIN;

    // Issue the invitation to the Party on A.
    const invitationDescriptor = await partyA.invitationManager.createInvitation({ secretProvider, secretValidator });

    // Redeem the invitation on B.
    expect(partyManagerB.parties).toHaveLength(0);
    const partyB = await partyManagerB.joinParty(invitationDescriptor, secretProvider);
    expect(partyB).toBeDefined();
    log(`Joined ${partyB.key.toHex()}`);

    let itemA: Item<any> | null = null;

    // Subscribe to Item updates on B.
    const [updated, onUpdate] = latch();
    partyB.database.queryItems({ type: 'dxn://example/item/test' })
      .subscribe((result) => {
        if (result.length) {
          const [itemB] = result;
          if (itemA && itemA.id === itemB.id) {
            log(`B has ${result[0].id}`);
            onUpdate();
          }
        }
      });

    // Create a new Item on A.
    itemA = await partyA.database.createItem({ model: ObjectModel, type: 'dxn://example/item/test' });
    log(`A created ${itemA.id}`);

    // Now wait to see it on B.
    await updated;

    // Check Party membership and displayName.
    for (const p of [partyA, partyB]) {
      const party = new Party(p);
      const members = party.queryMembers().value;
      expect(members.length).toBe(2);
      for (const member of members) {
        if (identityA.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(identityA.identityKey!.publicKey.humanize());
          expect(member.displayName).toEqual(identityA.displayName);
        }
        if (identityB.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(identityB.identityKey!.publicKey.humanize());
          expect(member.displayName).toEqual(identityB.displayName);
        }
      }
    }

    // await partyManagerA.close();
    // await partyManagerB.close();
  });

  test('Join a party - signature', async () => {
    const { partyManager: partyManagerA, identity: identityA } = await setup();
    const { partyManager: partyManagerB, identity: identityB } = await setup();
    await partyManagerA.open();
    await partyManagerB.open();

    // This would typically be a keypair associated with BotFactory.
    const keyPair = createKeyPair();

    // Create the Party.
    expect(partyManagerA.parties).toHaveLength(0);
    const partyA = await partyManagerA.createParty();
    expect(partyManagerA.parties).toHaveLength(1);
    log(`Created ${partyA.key.toHex()}`);

    // Create a validation function which tests the signature of a specific KeyPair.
    const secretValidator: SecretValidator = async (invitation, secret) => {
      const signature = secret.slice(0, SIGNATURE_LENGTH);
      const message = secret.slice(SIGNATURE_LENGTH);
      return verify(message, signature, keyPair.publicKey);
    };

    // Issue the invitation to the Party on A.
    const invitationDescriptor = await partyA.invitationManager.createInvitation({ secretValidator });

    // The "secret" is composed of the signature (fixed length) followed by the message (variable length).
    // The "secret" must be signed by the designated key.
    const secretProvider: SecretProvider = async () => {
      const message = randomBytes();
      const signature = sign(message, keyPair.secretKey);
      const secret = Buffer.alloc(signature.length + message.length);
      signature.copy(secret);
      message.copy(secret, signature.length);
      return secret;
    };

    // Redeem the invitation on B.
    expect(partyManagerB.parties).toHaveLength(0);
    const partyB = await partyManagerB.joinParty(invitationDescriptor, secretProvider);
    expect(partyB).toBeDefined();
    log(`Joined ${partyB.key.toHex()}`);

    let itemA: Item<any> | null = null;
    const [updated, onUpdate] = latch();

    // Subscribe to Item updates on B.
    partyB.database.queryItems({ type: 'dxn://example/item/test' })
      .subscribe((result) => {
        if (result.length) {
          const [itemB] = result;
          if (itemA && itemA.id === itemB.id) {
            log(`B has ${result[0].id}`);
            onUpdate();
          }
        }
      });

    // Create a new Item on A.
    itemA = await partyA.database.createItem({ model: ObjectModel, type: 'dxn://example/item/test' }) as Item<any>;
    log(`A created ${itemA.id}`);

    // Now wait to see it on B.
    await updated;

    // Check Party membership and displayName.
    for (const _party of [partyA, partyB]) {
      const party = new Party(_party);
      const members = party.queryMembers().value;
      expect(members.length).toBe(2);
      for (const member of members) {
        if (identityA.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(identityA.identityKey!.publicKey.humanize());
        }
        if (identityB.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(identityB.identityKey!.publicKey.humanize());
        }
      }
    }

    // TODO(burdon): Clean-up.
    // await partyManagerA.close();
    // await partyManagerB.close();
  });

  test('Join a party - Offline', async () => {
    const { partyManager: partyManagerA, identity: identityA } = await setup();
    const { partyManager: partyManagerB, identity: identityB } = await setup();
    assert(identityA.identityKey);
    assert(identityB.identityKey);

    await partyManagerA.open();
    await partyManagerB.open();

    // Create the Party.
    expect(partyManagerA.parties).toHaveLength(0);
    const partyA = await partyManagerA.createParty();
    expect(partyManagerA.parties).toHaveLength(1);
    log(`Created ${partyA.key.toHex()}`);

    const invitationDescriptor = await partyA.invitationManager
      .createOfflineInvitation(identityB.identityKey.publicKey);

    // Redeem the invitation on B.
    expect(partyManagerB.parties).toHaveLength(0);
    const partyB = await partyManagerB.joinParty(invitationDescriptor,
      OfflineInvitationClaimer.createSecretProvider(identityB));
    expect(partyB).toBeDefined();
    log(`Joined ${partyB.key.toHex()}`);

    let itemA: Item<any> | null = null;
    const [updated, onUpdate] = latch();

    // Subscribe to Item updates on B.
    partyB.database.queryItems({ type: 'dxn://example/item/test' })
      .subscribe((result) => {
        if (result.length) {
          const [itemB] = result;
          if (itemA && itemA.id === itemB.id) {
            log(`B has ${result[0].id}`);
            onUpdate();
          }
        }
      });

    // Create a new Item on A.
    itemA = await partyA.database.createItem({ model: ObjectModel, type: 'dxn://example/item/test' }) as Item<any>;
    log(`A created ${itemA.id}`);

    // Now wait to see it on B.
    await updated;

    // Check Party membership and displayName.
    for (const _party of [partyA, partyB]) {
      const party = new Party(_party);
      const members = party.queryMembers().value;
      expect(members.length).toBe(2);
      for (const member of members) {
        if (identityA.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(identityA.identityKey!.publicKey.humanize());
          expect(member.displayName).toEqual(identityA.displayName);
        }
        if (identityB.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(identityB.identityKey!.publicKey.humanize());
          expect(member.displayName).toEqual(identityB.displayName);
        }
      }
    }
  }).timeout(10_000);
});
