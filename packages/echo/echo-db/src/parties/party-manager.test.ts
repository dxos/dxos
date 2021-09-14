//
// Copyright 2020 DXOS.org
//

/* eslint-disable jest/no-conditional-expect */

import assert from 'assert';
import debug from 'debug';
import expect from 'expect';
import { it as test } from 'mocha';

import { latch, sleep } from '@dxos/async';
import {
  createPartyGenesisMessage,
  Keyring, KeyType,
  SecretProvider,
  SecretValidator
} from '@dxos/credentials';
import {
  createKeyPair, generateSeedPhrase,
  keyPairFromSeedPhrase, PublicKey,
  randomBytes,
  sign,
  SIGNATURE_LENGTH, verify
} from '@dxos/crypto';
import { checkType } from '@dxos/debug';
import { codec, EchoEnvelope, Timeframe } from '@dxos/echo-protocol';
import { createWritableFeedStream, FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { createStorage, STORAGE_RAM } from '@dxos/random-access-multi-storage';
import { afterTest } from '@dxos/testutils';

import { HaloFactory, IdentityManager } from '../halo';
import { autoPartyOpener } from '../halo/party-opener';
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
const setup = async (open = true, createIdentity = true) => {
  const keyring = new Keyring();
  const feedStore = FeedStoreAdapter.create(createStorage('', STORAGE_RAM), keyring);
  await feedStore.open();

  let seedPhrase;
  if (createIdentity) {
    seedPhrase = generateSeedPhrase();
    const keyPair = keyPairFromSeedPhrase(seedPhrase);
    await keyring.addKeyRecord({
      publicKey: PublicKey.from(keyPair.publicKey),
      secretKey: keyPair.secretKey,
      type: KeyType.IDENTITY
    });

    assert(keyring.keys.length === 1);
  }

  const snapshotStore = new SnapshotStore(createStorage('', STORAGE_RAM));
  const modelFactory = new ModelFactory().registerModel(ObjectModel);
  const networkManager = new NetworkManager();
  const partyFactory = new PartyFactory(
    () => identityManager.identity,
    networkManager,
    feedStore,
    modelFactory,
    snapshotStore,
    {
      writeLogger: messageLogger('<<<'),
      readLogger: messageLogger('>>>')
    }
  );

  const haloFactory: HaloFactory = new HaloFactory(partyFactory, networkManager, keyring);
  const identityManager = new IdentityManager(keyring, haloFactory);
  const partyManager = new PartyManager(feedStore, snapshotStore, () => identityManager.identity, partyFactory);
  afterTest(() => partyManager.close());

  identityManager.ready.once(() => {
    assert(identityManager.identity.halo?.isOpen);
    const unsub = autoPartyOpener(identityManager.identity.preferences!, partyManager);
    afterTest(unsub);
  });

  if (open) {
    await partyManager.open();
    if (createIdentity) {
      const haloParty = await identityManager.createHalo({
        identityDisplayName: identityManager.identity.identityKey!.publicKey.humanize()
      });
      afterTest(() => haloParty.close())
    }
  }

  return { feedStore, partyManager, identityManager, seedPhrase };
};

describe('Party manager', () => {
  after(async () => {
    await sleep(10000);
    (global as any).wtfnode.dump();
  });

  test('It exits cleanly', async () => {
    await setup();
  });

  test('Created locally', async () => {
    const { partyManager, identityManager } = await setup();

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
    const partyKey = identityManager.identity.keyring.getKey(party.key);
    expect(partyKey).toBeDefined();
    assert(partyKey);
    expect(identityManager.identity.keyring.hasSecretKey(partyKey)).toBe(false);

    await update;
  });

  test('Created via sync', async () => {
    const { feedStore, partyManager } = await setup();

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
    const { publicKey, secretKey } = createKeyPair();
    const feed = await feedStore.feedStore.createReadWriteFeed({
      key: PublicKey.from(publicKey),
      secretKey,
      metadata: { partyKey: partyKey.publicKey }
    });
    const feedKey = await keyring.addKeyRecord({
      publicKey: PublicKey.from(feed.key),
      secretKey: feed.secretKey,
      type: KeyType.FEED
    });

    const feedStream = createWritableFeedStream(feed);
    feedStream.write(createPartyGenesisMessage(keyring, partyKey, feedKey, identityKey));

    await partyManager.addParty(partyKey.publicKey, [{
      type: KeyType.FEED,
      publicKey: PublicKey.from(feed.key)
    }]);

    await update;
  });

  test('Create from cold start', async () => {
    const storage = createStorage('', STORAGE_RAM);
    const feedStore = new FeedStore(storage, { valueEncoding: codec });

    const keyring = new Keyring();
    const feedStoreAdapter = new FeedStoreAdapter(feedStore, keyring, storage);

    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    await keyring.createKeyRecord({ type: KeyType.DEVICE });

    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const snapshotStore = new SnapshotStore(createStorage('', STORAGE_RAM));
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
      const { publicKey, secretKey } = createKeyPair();
      const feed = await feedStore.createReadWriteFeed({
        key: PublicKey.from(publicKey),
        secretKey,
        metadata: { partyKey: partyKey.publicKey, writable: true }
      });
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

  test('Creates invitation and exits cleanly', async () => {
    const { partyManager: partyManagerA } = await setup();

    const partyA = await partyManagerA.createParty();
    const PIN = Buffer.from('0000');
    const secretProvider: SecretProvider = async () => PIN;
    const secretValidator: SecretValidator = async (invitation, secret) => secret.equals(PIN);
    await partyA.invitationManager.createInvitation({ secretProvider, secretValidator }, {expiration: Date.now() + 3000});
  });

  test('Create invitation', async () => {
    const { partyManager: partyManagerA } = await setup();
    const { partyManager: partyManagerB } = await setup();

    const partyA = await partyManagerA.createParty();
    const PIN = Buffer.from('0000');
    const secretProvider: SecretProvider = async () => PIN;
    const secretValidator: SecretValidator = async (invitation, secret) => secret.equals(PIN);
    const invitationDescriptor = await partyA.invitationManager.createInvitation({ secretProvider, secretValidator });

    const partyB = await partyManagerB.joinParty(invitationDescriptor, secretProvider);
    expect(partyB).toBeDefined();

    const [updated, onUpdate] = latch();
    partyB.database.select(s => s.filter({ type: 'dxn://example/item/test' }).items)
      .update.on((items) => {
        if (items.length) {
          const [itemB] = items;
          if (itemA && itemA.id === itemB.id) {
            log(`B has ${items[0].id}`);
            onUpdate();
          }
        }
      });

    const itemA = await partyA.database.createItem({ model: ObjectModel, type: 'dxn://example/item/test' });
    log(`A created ${itemA.id}`);
    await updated;
  });

  test('Join a party - PIN', async () => {
    const { partyManager: partyManagerA, identityManager: identityManagerA } = await setup();
    const { partyManager: partyManagerB, identityManager: identityManagerB } = await setup();
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
    let inviterOnFinishCalled = false;
    const invitationDescriptor = await partyA.invitationManager.createInvitation(
      { secretProvider, secretValidator },
      {
        onFinish: () => {
          inviterOnFinishCalled = true;
        }
      }
    );

    // Redeem the invitation on B.
    expect(partyManagerB.parties).toHaveLength(0);
    const partyB = await partyManagerB.joinParty(invitationDescriptor, secretProvider);
    expect(partyB).toBeDefined();
    log(`Joined ${partyB.key.toHex()}`);

    let itemA: Item<any> | null = null;

    // Subscribe to Item updates on B.
    const [updated, onUpdate] = latch();
    partyB.database.select(s => s.filter({ type: 'dxn://example/item/test' }).items)
      .update.on((items) => {
        if (items.length) {
          const [itemB] = items;
          if (itemA && itemA.id === itemB.id) {
            log(`B has ${items[0].id}`);
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
        if (identityManagerA.identity.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(identityManagerA.identity.identityKey!.publicKey.humanize());
          expect(member.displayName).toEqual(identityManagerA.identity.displayName);
        }
        if (identityManagerB.identity.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(identityManagerB.identity.identityKey!.publicKey.humanize());
          expect(member.displayName).toEqual(identityManagerB.identity.displayName);
        }
      }
    }

    expect(inviterOnFinishCalled).toBeTruthy();

    // await partyManagerA.close();
    // await partyManagerB.close();
  });

  test('Join a party - signature', async () => {
    const { partyManager: partyManagerA, identityManager: identityManagerA } = await setup();
    const { partyManager: partyManagerB, identityManager: identityManagerB } = await setup();
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
    partyB.database.select(s => s.filter({ type: 'dxn://example/item/test' }).items)
      .update.on((items) => {
        if (items.length) {
          const [itemB] = items;
          if (itemA && itemA.id === itemB.id) {
            log(`B has ${items[0].id}`);
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
        if (identityManagerA.identity.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(identityManagerA.identity.identityKey!.publicKey.humanize());
        }
        if (identityManagerB.identity.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(identityManagerB.identity.identityKey!.publicKey.humanize());
        }
      }
    }

    // TODO(burdon): Clean-up.
    // await partyManagerA.close();
    // await partyManagerB.close();
  });

  test('Join a party - Offline', async () => {
    const { partyManager: partyManagerA, identityManager: identityManagerA } = await setup();
    const { partyManager: partyManagerB, identityManager: identityManagerB } = await setup();
    assert(identityManagerA.identity.identityKey);
    assert(identityManagerB.identity.identityKey);

    await partyManagerA.open();
    await partyManagerB.open();

    // Create the Party.
    expect(partyManagerA.parties).toHaveLength(0);
    const partyA = await partyManagerA.createParty();
    expect(partyManagerA.parties).toHaveLength(1);
    log(`Created ${partyA.key.toHex()}`);

    const invitationDescriptor = await partyA.invitationManager
      .createOfflineInvitation(identityManagerB.identity.identityKey.publicKey);

    // Redeem the invitation on B.
    expect(partyManagerB.parties).toHaveLength(0);
    const partyB = await partyManagerB.joinParty(invitationDescriptor,
      OfflineInvitationClaimer.createSecretProvider(identityManagerB.identity));
    expect(partyB).toBeDefined();
    log(`Joined ${partyB.key.toHex()}`);

    let itemA: Item<any> | null = null;
    const [updated, onUpdate] = latch();

    // Subscribe to Item updates on B.
    partyB.database.select(s => s.filter({ type: 'dxn://example/item/test' }).items)
      .update.on((items) => {
        if (items.length) {
          const [itemB] = items;
          if (itemA && itemA.id === itemB.id) {
            log(`B has ${items[0].id}`);
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
        if (identityManagerA.identity.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(identityManagerA.identity.identityKey!.publicKey.humanize());
          expect(member.displayName).toEqual(identityManagerA.identity.displayName);
        }
        if (identityManagerB.identity.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(identityManagerB.identity.identityKey!.publicKey.humanize());
          expect(member.displayName).toEqual(identityManagerB.identity.displayName);
        }
      }
    }
  }).timeout(10_000);
});
