//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import expect from 'expect';
import { it as test } from 'mocha';
import ram from 'random-access-memory';

import { waitForCondition, latch } from '@dxos/async';
import {
  createPartyGenesisMessage,
  generateSeedPhrase,
  keyPairFromSeedPhrase,
  KeyType,
  Keyring,
  SecretProvider,
  SecretValidator
} from '@dxos/credentials';
import {
  PublicKey,
  createKeyPair,
  randomBytes,
  sign,
  verify,
  SIGNATURE_LENGTH
} from '@dxos/crypto';
import { checkType } from '@dxos/debug';
import { codec, EchoEnvelope, Timeframe } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { afterTest } from '@dxos/testutils';
import { createWritableFeedStream } from '@dxos/util';

import { HALO_PARTY_CONTACT_LIST_TYPE, HaloFactory, IdentityManager } from '../halo';
import { autoPartyOpener } from '../halo/party-opener';
import { InvitationDescriptor, OfflineInvitationClaimer } from '../invitations';
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
  const feedStore = FeedStoreAdapter.create(ram);
  await feedStore.open();
  const keyring = new Keyring();

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

  const snapshotStore = new SnapshotStore(ram);
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
    assert(identityManager.halo?.isOpen);
    const unsub = autoPartyOpener(identityManager.halo!, partyManager);
    afterTest(unsub);
  });

  if (open) {
    await partyManager.open();
    if (createIdentity) {
      await identityManager.createHalo({
        identityDisplayName: identityManager.identityKey!.publicKey.humanize()
      });
    }
  }

  return { feedStore, partyManager, identityManager, seedPhrase };
};

describe('Party manager', () => {
  test('Created locally', async () => {
    const { partyManager, identityManager } = await setup();
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
    const partyKey = identityManager.keyring.getKey(party.key);
    expect(partyKey).toBeDefined();
    assert(partyKey);
    expect(identityManager.keyring.hasSecretKey(partyKey)).toBe(false);

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
        if (identityManagerA.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(identityManagerA.identityKey!.publicKey.humanize());
          expect(member.displayName).toEqual(identityManagerA.displayName);
        }
        if (identityManagerB.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(identityManagerB.identityKey!.publicKey.humanize());
          expect(member.displayName).toEqual(identityManagerB.displayName);
        }
      }
    }

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
        if (identityManagerA.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(identityManagerA.identityKey!.publicKey.humanize());
        }
        if (identityManagerB.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(identityManagerB.identityKey!.publicKey.humanize());
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
    assert(identityManagerA.identityKey);
    assert(identityManagerB.identityKey);

    await partyManagerA.open();
    await partyManagerB.open();

    // Create the Party.
    expect(partyManagerA.parties).toHaveLength(0);
    const partyA = await partyManagerA.createParty();
    expect(partyManagerA.parties).toHaveLength(1);
    log(`Created ${partyA.key.toHex()}`);

    const invitationDescriptor = await partyA.invitationManager
      .createOfflineInvitation(identityManagerB.identityKey.publicKey);

    // Redeem the invitation on B.
    expect(partyManagerB.parties).toHaveLength(0);
    const partyB = await partyManagerB.joinParty(invitationDescriptor,
      OfflineInvitationClaimer.createSecretProvider(identityManagerB));
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
        if (identityManagerA.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(identityManagerA.identityKey!.publicKey.humanize());
          expect(member.displayName).toEqual(identityManagerA.displayName);
        }
        if (identityManagerB.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(identityManagerB.identityKey!.publicKey.humanize());
          expect(member.displayName).toEqual(identityManagerB.displayName);
        }
      }
    }
  }).timeout(10_000);

  test('Deactivate Party - single device', async () => {
    const { partyManager: partyManagerA } = await setup();
    await partyManagerA.open();

    const partyA = new Party(await partyManagerA.createParty());
    const partyB = new Party(await partyManagerA.createParty());

    expect(partyA.isOpen).toBe(true);
    expect(partyB.isOpen).toBe(true);

    await partyA.setTitle('A');
    await partyB.setTitle('B');

    expect(partyA.title).toBe('A');
    expect(partyB.title).toBe('B');

    await partyB.deactivate({ global: true });

    expect(partyA.isOpen).toBe(true);
    expect(partyB.isOpen).toBe(false);

    expect(partyA.title).toBe('A');
    expect(partyB.title).toBe('B');

    await partyB.activate({ global: true });

    expect(partyA.isOpen).toBe(true);
    expect(partyB.isOpen).toBe(true);

    expect(partyA.title).toBe('A');
    expect(partyB.title).toBe('B');
  });

  test('Deactivate Party - retrieving items', async () => {
    const { partyManager: partyManagerA } = await setup(true, true);

    // TODO(burdon): Race condition: partyA is not well-formed.
    const partyA = new Party(await partyManagerA.createParty());

    expect(partyA.isOpen).toBe(true);
    expect(partyA.isActive).toBe(true);

    // Create an item.
    let itemA: Item<any> | null = null;
    const [updated, onUpdate] = latch();

    partyA.database.queryItems({ type: 'dxn://example/item/test' })
      .subscribe((result) => {
        if (result.length) {
          const [receivedItem] = result;
          if (itemA && itemA.id === receivedItem.id) {
            onUpdate();
          }
        }
      });

    itemA = await partyA.database.createItem({ model: ObjectModel, type: 'dxn://example/item/test' }) as Item<any>;
    await updated; // Wait for update.

    expect((await partyA.database.queryItems({ type: 'dxn://example/item/test' })).value.length).toEqual(1);

    await partyA.deactivate({ global: true });
    await partyA.activate({ global: true });

    expect(partyA.isOpen).toBe(true);
    expect(partyA.isActive).toBe(true);

    await waitForCondition(() => partyA.database.queryItems({ type: 'dxn://example/item/test' }).value.length > 0, 5000);
    expect((await partyA.database.queryItems({ type: 'dxn://example/item/test' })).value.length).toEqual(1);
  }).timeout(10_000);

  test.skip('Deactivate Party - multi device', async () => {
    const a = await setup(true, true);
    const b = await setup(true, false);
    assert(a.seedPhrase);

    await a.partyManager.open();
    await b.partyManager.open();

    await b.identityManager.recoverHalo(a.seedPhrase);
    await a.partyManager.createParty();

    await waitForCondition(() => b.partyManager.parties.length, 1000);

    expect(a.partyManager.parties[0].isOpen).toBe(true);
    expect(b.partyManager.parties[0].isOpen).toBe(true);

    await a.partyManager.parties[0].deactivate({ device: true });
    await waitForCondition(() => !a.partyManager.parties[0].isOpen);

    expect(a.partyManager.parties[0].isOpen).toBe(false);
    expect(b.partyManager.parties[0].isOpen).toBe(true);

    await a.partyManager.parties[0].deactivate({ global: true });
    await waitForCondition(() => !b.partyManager.parties[0].isOpen, 1000);

    expect(a.partyManager.parties[0].isOpen).toBe(false);
    expect(b.partyManager.parties[0].isOpen).toBe(false);

    await a.partyManager.parties[0].activate({ global: true });
    await waitForCondition(() => a.partyManager.parties[0].isOpen && b.partyManager.parties[0].isOpen, 1000);

    expect(a.partyManager.parties[0].isOpen).toBe(true);
    expect(b.partyManager.parties[0].isOpen).toBe(true);
  });

  // TODO(burdon): Sporadically fails: https://github.com/dxos/echo/issues/391
  test.skip('Setting title propagates to other devices AND other party members', async () => {
    // User creating the party
    const { partyManager: partyManagerA, identityManager: identityManagerA, seedPhrase } = await setup(true, true);
    assert(seedPhrase);

    // User's other device, joined by device invitation
    const { partyManager: partyManagerB, identityManager: identityManagerB } = await setup(true, false);

    // User's  other device, joined by seed phrase recovery.
    const { partyManager: partyManagerC, identityManager: identityManagerC } = await setup(true, false);

    // Another user in the party.
    const { partyManager: partyManagerD } = await setup(true, true);

    const partyA = new Party(await partyManagerA.createParty());
    expect(partyA.isOpen).toBe(true);
    expect(partyA.isActive).toBe(true);

    // B joins as another device of A, device invitation.

    const pinSecret = '0000';
    const secretProviderDevice: SecretProvider = async () => Buffer.from(pinSecret);
    const secretValidatorDevice: SecretValidator = async (invitation, secret) =>
      secret && Buffer.isBuffer(invitation.secret) && secret.equals(invitation.secret);

    const invitation = await identityManagerA?.halo?.invitationManager.createInvitation({
      secretValidator: secretValidatorDevice,
      secretProvider: secretProviderDevice
    }) as InvitationDescriptor;

    expect(partyManagerB.parties.length).toBe(0);
    await identityManagerB.joinHalo(invitation, secretProviderDevice);
    expect(identityManagerB.halo).toBeDefined();
    await waitForCondition(() => partyManagerB.parties.length, 1000);
    expect(partyManagerB.parties.length).toBe(1);
    const partyB = new Party(partyManagerB.parties[0]);

    // C joins as another device of A, seed phrase recovery.

    await identityManagerC.recoverHalo(seedPhrase);
    expect(identityManagerC.halo).toBeDefined();
    await waitForCondition(() => partyManagerC.parties.length, 1000);
    expect(partyManagerC.parties.length).toBe(1);
    const partyC = new Party(partyManagerC.parties[0]);

    // D joins as another member of the party.

    const PIN = Buffer.from('0000');
    const secretValidator: SecretValidator = async (invitation, secret) => secret.equals(PIN);
    const secretProvider: SecretProvider = async () => PIN;
    const invitationDescriptor = await partyManagerA.parties[0].invitationManager
      .createInvitation({ secretProvider, secretValidator });
    expect(partyManagerD.parties).toHaveLength(0);
    const partyD = new Party(await partyManagerD.joinParty(invitationDescriptor, secretProvider));
    expect(partyD).toBeDefined();
    expect(partyManagerD.parties).toHaveLength(1);

    // Checking propagation of title.

    expect(partyA.title).toBe(undefined);
    expect(partyB.title).toBe(undefined);
    expect(partyC.title).toBe(undefined);
    expect(partyD.title).toBe(undefined);

    await partyA.setTitle('Test');

    for (const _party of [partyA, partyB, partyC]) {
      await waitForCondition(() => _party.getProperty('title') === 'Test', 3000);
      expect(_party.title).toEqual('Test');
    }

    // For the other member of the party, title propagates correctly as well
    await waitForCondition(() => partyD.getProperty('title') === 'Test', 3000);
    expect(partyD.title).toEqual('Test'); // However this does not
  });

  // TODO(burdon): Fix.
  // Note: The reason I wrote this test is because it does not seem to be working properly in Teamwork.
  // I don't seem to be receiving an update after which party.title holds correct value.
  // https://github.com/dxos/teamwork/issues/496#issuecomment-739862830
  // However it seems to be working fine in this test.
  test.skip('Party update event is emitted after the title is set', async () => {
    const { partyManager: partyManagerA, identityManager: identityManagerA, seedPhrase } = await setup(true, true);
    const { partyManager: partyManagerB, identityManager: identityManagerB } = await setup(true, false);
    const { partyManager: partyManagerC, identityManager: identityManagerC } = await setup(true, false);
    assert(seedPhrase);

    const partyA = new Party(await partyManagerA.createParty());

    // B joins as another device of A, device invitation/

    const pinSecret = '0000';
    const secretProviderDevice: SecretProvider = async () => Buffer.from(pinSecret);
    const secretValidatorDevice: SecretValidator = async (invitation, secret) =>
      secret && Buffer.isBuffer(invitation.secret) && secret.equals(invitation.secret);

    const invitation = await identityManagerA?.halo?.invitationManager.createInvitation({
      secretValidator: secretValidatorDevice,
      secretProvider: secretProviderDevice
    }) as InvitationDescriptor;

    expect(partyManagerB.parties.length).toBe(0);

    await identityManagerB.joinHalo(invitation, secretProviderDevice);
    expect(identityManagerB.halo).toBeDefined();

    await waitForCondition(() => partyManagerB.parties.length, 1000);
    expect(partyManagerB.parties.length).toBe(1);
    const partyB = new Party(partyManagerB.parties[0]);

    // C joins as another device of A, seed phrase recovery.

    await identityManagerC.recoverHalo(seedPhrase);
    expect(identityManagerC.halo).toBeDefined();

    await waitForCondition(() => partyManagerC.parties.length, 1000);
    expect(partyManagerC.parties.length).toBe(1);
    const partyC = new Party(partyManagerC.parties[0]);

    // Hooking to party updates.

    let titleInC = partyC.title;
    partyC.update.on(() => {
      titleInC = partyC.title;
    });

    let titleInB = partyB.title;
    partyB.update.on(() => {
      titleInB = partyB.title;
    });

    await partyA.setTitle('value-1');
    expect(partyA.title).toEqual('value-1');
    await waitForCondition(() => titleInC === 'value-1', 10000);
    await waitForCondition(() => titleInB === 'value-1', 10000);

    await partyA.setTitle('value-2');
    expect(partyA.title).toEqual('value-2');
    await waitForCondition(() => titleInC === 'value-2', 10000);
    await waitForCondition(() => titleInB === 'value-2', 10000);
  });
});
