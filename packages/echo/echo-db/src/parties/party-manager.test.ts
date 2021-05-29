//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import ram from 'random-access-memory';

import { waitForCondition, latch } from '@dxos/async';
import {
  createPartyGenesisMessage,
  KeyType,
  Keyring,
  generateSeedPhrase,
  keyPairFromSeedPhrase,
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
import { createWritableFeedStream } from '@dxos/util';

import { InvitationDescriptor, OfflineInvitationClaimer } from '../invitations';
import { Item } from '../items';
import { SnapshotStore } from '../snapshots';
import { FeedStoreAdapter, messageLogger } from '../util';
import { HaloFactory } from './halo-factory';
import { HALO_PARTY_CONTACT_LIST_TYPE } from './halo-party';
import { IdentityManager } from './identity-manager';
import { Party } from './party';
import { PartyFactory } from './party-factory';
import { PARTY_ITEM_TYPE } from './party-internal';
import { PartyManager } from './party-manager';

const log = debug('dxos:echo:parties:party-manager:test');

// TODO(burdon): Close cleanly.
// This usually means that there are asynchronous operations that weren't stopped in your tests.

const setup = async (open = true, createIdentity = true) => {
  const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
  const feedStoreAdapter = new FeedStoreAdapter(feedStore);
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
  }

  const identityManager = new IdentityManager(keyring);
  const snapshotStore = new SnapshotStore(ram);
  const modelFactory = new ModelFactory().registerModel(ObjectModel);
  const networkManager = new NetworkManager();
  const partyFactory = new PartyFactory(
    identityManager,
    networkManager,
    feedStoreAdapter,
    modelFactory,
    snapshotStore,
    {
      writeLogger: messageLogger('<<<'),
      readLogger: messageLogger('>>>')
    }
  );

  const haloFactory = new HaloFactory(partyFactory, identityManager, networkManager);
  const partyManager = new PartyManager(identityManager, feedStoreAdapter, snapshotStore, partyFactory, haloFactory);

  if (open) {
    await partyManager.open();
    if (createIdentity) {
      await partyManager.createHalo({
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
    await partyManager.close();
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
    const feed = await feedStore.openFeed(
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
    await partyManager.close();
  });

  test('Create from cold start', async () => {
    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
    const feedStoreAdapter = new FeedStoreAdapter(feedStore);

    const keyring = new Keyring();
    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    await keyring.createKeyRecord({ type: KeyType.DEVICE });
    const identityManager = new IdentityManager(keyring);

    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const snapshotStore = new SnapshotStore(ram);
    const networkManager = new NetworkManager();
    const partyFactory =
      new PartyFactory(identityManager, networkManager, feedStoreAdapter, modelFactory, snapshotStore);
    const haloFactory = new HaloFactory(partyFactory, identityManager, networkManager);
    const partyManager =
      new PartyManager(identityManager, feedStoreAdapter, snapshotStore, partyFactory, haloFactory);

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

    // await partyManagerA.close();
    // await partyManagerB.close();
  });

  test('One user, two devices', async () => {
    const { partyManager: partyManagerA, identityManager: identityManagerA } = await setup(true, true);
    const { partyManager: partyManagerB, identityManager: identityManagerB } = await setup(true, false);

    expect(identityManagerA.halo).toBeDefined();
    expect(identityManagerB.halo).not.toBeDefined();

    expect(partyManagerA.parties.length).toBe(0);
    await partyManagerA.createParty();
    expect(partyManagerA.parties.length).toBe(1);

    const pinSecret = '0000';
    const secretProvider: SecretProvider = async () => Buffer.from(pinSecret);
    const secretValidator: SecretValidator = async (invitation, secret) =>
      secret && Buffer.isBuffer(invitation.secret) && secret.equals(invitation.secret);

    // Issue the invitation on nodeA.
    const invitation = await identityManagerA?.halo?.invitationManager.createInvitation({
      secretValidator,
      secretProvider
    }) as InvitationDescriptor;

    // Should not have any parties.
    expect(partyManagerB.parties.length).toBe(0);

    // And then redeem it on nodeB.
    await partyManagerB.joinHalo(invitation, secretProvider);
    expect(identityManagerA.halo).toBeDefined();
    expect(identityManagerB.halo).toBeDefined();

    // Check the initial party is opened.
    await waitForCondition(() => partyManagerB.parties.length, 1000);
    expect(partyManagerB.parties.length).toBe(1);

    {
      let itemA: Item<any> | null = null;
      const [updated, onUpdate] = latch();

      // Subscribe to Item updates on B.
      identityManagerB.halo?.database.queryItems({ type: 'dxn://example/item/test' })
        .subscribe((result) => {
          if (result.length) {
            if (itemA && result.find(item => item.id === itemA?.id)) {
              log(`B has ${itemA.id}`);
              onUpdate();
            }
          }
        });

      // Create a new Item on A.
      itemA = await identityManagerA.halo?.database
        .createItem({ model: ObjectModel, type: 'dxn://example/item/test' }) as Item<any>;
      log(`A created ${itemA.id}`);

      // Now wait to see it on B.
      await updated;
    }

    const [partyUpdated, onPartyUpdate] = latch();
    partyManagerB.update.on(onPartyUpdate);

    // Now create a Party on A and make sure it gets opened on both A and B.
    const partyA2 = await partyManagerA.createParty();
    await partyA2.open();
    expect(partyManagerA.parties.length).toBe(2);

    await partyUpdated;
    expect(partyManagerB.parties.length).toBe(2);
    expect(partyManagerA.parties[0].key).toEqual(partyManagerB.parties[0].key);
    expect(partyManagerA.parties[1].key).toEqual(partyManagerB.parties[1].key);

    {
      let itemA: Item<any> | null = null;
      const [updated, onUpdate] = latch();

      // Subscribe to Item updates on A.
      partyManagerA.parties[0].database.queryItems({ type: 'dxn://example/item/test' })
        .subscribe((result) => {
          if (result.length) {
            const [itemB] = result;
            if (itemA && itemA.id === itemB.id) {
              log(`B has ${result[0].id}`);
              onUpdate();
            }
          }
        });

      // Create a new Item on B.
      itemA = await partyManagerB.parties[0].database
        .createItem({ model: ObjectModel, type: 'dxn://example/item/test' }) as Item<any>;

      // Now wait to see it on A.
      await updated;
    }
  });

  test('Two users, two devices each', async () => {
    const { partyManager: partyManagerA1, identityManager: identityManagerA1 } = await setup(true, true);
    const { partyManager: partyManagerA2, identityManager: identityManagerA2 } = await setup(true, false);
    const { partyManager: partyManagerB1, identityManager: identityManagerB1 } = await setup(true, true);
    const { partyManager: partyManagerB2, identityManager: identityManagerB2 } = await setup(true, false);

    expect(identityManagerA1.halo).toBeDefined();
    expect(identityManagerA2.halo).not.toBeDefined();

    expect(identityManagerB1.halo).toBeDefined();
    expect(identityManagerB2.halo).not.toBeDefined();

    const pinSecret = '0000';
    const secretProvider: SecretProvider = async () => Buffer.from(pinSecret);
    const secretValidator: SecretValidator = async (invitation, secret) =>
      secret && Buffer.isBuffer(invitation.secret) && secret.equals(invitation.secret);

    {
      // Issue the invitation on nodeA.
      const invitation = await identityManagerA1?.halo?.invitationManager.createInvitation({
        secretValidator,
        secretProvider
      }) as InvitationDescriptor;

      // And then redeem it on nodeB.
      await partyManagerA2.joinHalo(invitation, secretProvider);
    }

    {
      // Issue the invitation on node 1.
      const invitation = await identityManagerB1?.halo?.invitationManager.createInvitation({
        secretValidator,
        secretProvider
      }) as InvitationDescriptor;

      // And then redeem it on nodeB.
      await partyManagerB2.joinHalo(invitation, secretProvider);
    }

    // Now create a Party on 1 and make sure it gets opened on both 1 and 2.
    let partyA;
    {
      expect(partyManagerA1.parties.length).toBe(0);
      expect(partyManagerA2.parties.length).toBe(0);

      const [partyUpdatedA, onPartyUpdateA] = latch();
      partyManagerA2.update.on(onPartyUpdateA);

      partyA = await partyManagerA1.createParty();
      await partyUpdatedA;

      expect(partyManagerA1.parties.length).toBe(1);
      expect(partyManagerA2.parties.length).toBe(1);
      expect(partyManagerA1.parties[0].key).toEqual(partyManagerA2.parties[0].key);
    }

    // Invite B to join the Party.
    {
      expect(partyManagerB1.parties.length).toBe(0);
      expect(partyManagerB2.parties.length).toBe(0);

      const [partyUpdatedB, onPartyUpdateB] = latch();
      partyManagerB2.update.on(onPartyUpdateB);

      const invitation = await partyA.invitationManager.createInvitation({ secretProvider, secretValidator });
      await partyManagerB1.joinParty(invitation, secretProvider);

      await partyUpdatedB;
      expect(partyManagerB1.parties.length).toBe(1);
      expect(partyManagerB2.parties.length).toBe(1);
      expect(partyManagerB1.parties[0].key).toEqual(partyManagerB2.parties[0].key);

      // A and B now both belong to the Party
      expect(partyManagerA1.parties[0].key).toEqual(partyManagerB1.parties[0].key);
    }

    // Empty across the board.
    for (const partyManager of [partyManagerA1, partyManagerA2, partyManagerB1, partyManagerB2]) {
      const [party] = partyManager.parties;
      expect(party.database.queryItems({ type: 'dxn://example/item/test' }).value.length).toBe(0);
    }

    for await (const partyManager of [partyManagerA1, partyManagerA2, partyManagerB1, partyManagerB2]) {
      let item: Item<any> | null = null;
      const [party] = partyManager.parties;
      const itemPromises = [];

      for (const otherManager of [partyManagerA1, partyManagerA2, partyManagerB1, partyManagerB2]) {
        if (partyManager !== otherManager) {
          const [otherParty] = otherManager.parties;
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
      }

      item = await party.database.createItem({ model: ObjectModel, type: 'dxn://example/item/test' }) as Item<any>;
      await Promise.all(itemPromises);
    }
  });

  test('Join new device to HALO by recovering from Identity seed phrase', async () => {
    const { partyManager: partyManagerA, identityManager: identityManagerA, seedPhrase } = await setup(true, true);
    const { partyManager: partyManagerB, identityManager: identityManagerB } = await setup(true, false);
    assert(seedPhrase);

    expect(identityManagerA.halo).toBeDefined();
    expect(identityManagerB.halo).not.toBeDefined();

    // And then redeem it on nodeB.
    await partyManagerB.recoverHalo(seedPhrase);
    expect(identityManagerA.halo).toBeDefined();
    expect(identityManagerB.halo).toBeDefined();

    {
      let itemA: Item<any> | null = null;
      const [updated, onUpdate] = latch();

      // Subscribe to Item updates on B.
      identityManagerB.halo?.database.queryItems({ type: 'dxn://example/item/test' })
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
      itemA = await identityManagerA.halo?.database
        .createItem({ model: ObjectModel, type: 'dxn://example/item/test' }) as Item<any>;
      log(`A created ${itemA.id}`);

      // Now wait to see it on B.
      await updated;
    }

    // Now create a Party on A and make sure it gets opened on both A and B.
    expect(partyManagerA.parties.length).toBe(0);
    expect(partyManagerB.parties.length).toBe(0);

    const [partyUpdated, onPartyUpdate] = latch();
    partyManagerB.update.on(onPartyUpdate);

    const partyA = await partyManagerA.createParty();
    await partyA.open();
    expect(partyManagerA.parties.length).toBe(1);

    await partyUpdated;
    expect(partyManagerB.parties.length).toBe(1);
    expect(partyManagerA.parties[0].key).toEqual(partyManagerB.parties[0].key);

    {
      let itemA: Item<any> | null = null;
      const [updated, onUpdate] = latch();

      // Subscribe to Item updates on A.
      partyManagerA.parties[0].database.queryItems({ type: 'dxn://example/item/test' })
        .subscribe((result) => {
          if (result.length) {
            const [itemB] = result;
            if (itemA && itemA.id === itemB.id) {
              log(`B has ${result[0].id}`);
              onUpdate();
            }
          }
        });

      // Create a new Item on B.
      itemA = await partyManagerB.parties[0].database
        .createItem({ model: ObjectModel, type: 'dxn://example/item/test' }) as Item<any>;

      // Now wait to see it on A.
      await updated;
    }
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
  });

  test('Contacts', async () => {
    const { partyManager: partyManagerA, identityManager: identityManagerA } = await setup();
    const { partyManager: partyManagerB, identityManager: identityManagerB } = await setup();
    assert(identityManagerA.identityKey);
    assert(identityManagerB.identityKey);

    await partyManagerA.open();
    await partyManagerB.open();

    const [updatedA, onUpdateA] = latch();
    const [updatedB, onUpdateB] = latch();

    identityManagerA?.halo?.database.queryItems({ type: HALO_PARTY_CONTACT_LIST_TYPE }).subscribe((value) => {
      const [list] = value;
      if (list && list.model.getProperty(identityManagerB?.identityKey?.publicKey.toHex())) {
        onUpdateA();
      }
    });

    identityManagerB?.halo?.database.queryItems({ type: HALO_PARTY_CONTACT_LIST_TYPE }).subscribe((value) => {
      const [list] = value;
      if (list && list.model.getProperty(identityManagerA?.identityKey?.publicKey.toHex())) {
        onUpdateB();
      }
    });

    // Create the Party.
    expect(partyManagerA.parties).toHaveLength(0);
    const partyA = await partyManagerA.createParty();
    expect(partyManagerA.parties).toHaveLength(1);
    log(`Created ${partyA.key.toHex()}`);

    const invitationDescriptor =
      await partyA.invitationManager.createOfflineInvitation(identityManagerB.identityKey.publicKey);

    // Redeem the invitation on B.
    expect(partyManagerB.parties).toHaveLength(0);
    const partyB = await partyManagerB.joinParty(invitationDescriptor,
      OfflineInvitationClaimer.createSecretProvider(identityManagerB));
    expect(partyB).toBeDefined();
    log(`Joined ${partyB.key.toHex()}`);

    await updatedA;
    await updatedB;
  });

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

    const partyA = new Party(await partyManagerA.createParty());

    expect(partyA.isOpen).toBe(true);
    expect(partyA.isActive()).toBe(true);

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
    await updated; // wait to see the update

    expect((await partyA.database.queryItems({ type: 'dxn://example/item/test' })).value.length).toEqual(1);

    await partyA.deactivate({ global: true });
    await partyA.activate({ global: true });

    expect(partyA.isOpen).toBe(true);
    expect(partyA.isActive()).toBe(true);

    await waitForCondition(() => partyA.database.queryItems({ type: 'dxn://example/item/test' }).value.length > 0, 5000);
    expect((await partyA.database.queryItems({ type: 'dxn://example/item/test' })).value.length).toEqual(1);
  }, 10000);

  test.skip('Deactivate Party - multi device', async () => {
    const { partyManager: partyManagerA, seedPhrase } = await setup(true, true);
    const { partyManager: partyManagerB } = await setup(true, false);
    assert(seedPhrase);

    await partyManagerA.open();
    await partyManagerB.open();

    await partyManagerB.recoverHalo(seedPhrase);
    await partyManagerA.createParty();

    await waitForCondition(() => partyManagerB.parties.length, 1000);

    expect(partyManagerA.parties[0].isOpen).toBe(true);
    expect(partyManagerB.parties[0].isOpen).toBe(true);

    await partyManagerA.parties[0].deactivate({ device: true });
    await waitForCondition(() => !partyManagerA.parties[0].isOpen);

    expect(partyManagerA.parties[0].isOpen).toBe(false);
    expect(partyManagerB.parties[0].isOpen).toBe(true);

    await partyManagerA.parties[0].deactivate({ global: true });
    await waitForCondition(() => !partyManagerB.parties[0].isOpen, 1000);

    expect(partyManagerA.parties[0].isOpen).toBe(false);
    expect(partyManagerB.parties[0].isOpen).toBe(false);

    await partyManagerA.parties[0].activate({ global: true });
    await waitForCondition(() => partyManagerA.parties[0].isOpen && partyManagerB.parties[0].isOpen, 1000);

    expect(partyManagerA.parties[0].isOpen).toBe(true);
    expect(partyManagerB.parties[0].isOpen).toBe(true);
  });

  test('Deactivating and activating party.', async () => {
    const { partyManager: partyManagerA } = await setup();
    await partyManagerA.open();

    const partyA = new Party(await partyManagerA.createParty());
    expect(partyA.isOpen).toBe(true);
    expect(partyA.isActive()).toBe(true);

    await partyA.setTitle('A');
    expect(partyA.title).toBe('A');
    expect(partyA.getProperty('title')).toBe('A');

    await partyA.deactivate({ global: true });
    expect(partyA.isOpen).toBe(false);
    expect(partyA.isActive()).toBe(false);
    expect(partyA.title).toBe('A');

    await partyA.activate({ global: true });
    expect(partyA.isOpen).toBe(true);
    expect(partyA.isActive()).toBe(true);
    expect(partyA.title).toBe('A');

    await waitForCondition(() => partyA.getProperty('title') === 'A', 4000);
  });

  test('Deactivating and activating party, setting properties after', async () => {
    const { partyManager: partyManagerA } = await setup();
    await partyManagerA.open();

    const partyA = new Party(await partyManagerA.createParty());

    expect(partyA.isOpen).toBe(true);
    expect(partyA.isActive()).toBe(true);

    await partyA.setTitle('A');
    expect(partyA.title).toBe('A');

    await partyA.deactivate({ global: true });
    expect(partyA.isOpen).toBe(false);
    expect(partyA.isActive()).toBe(false);
    expect(partyA.title).toBe('A');

    await partyA.activate({ global: true });
    expect(partyA.isOpen).toBe(true);
    expect(partyA.isActive()).toBe(true);
    expect(partyA.title).toBe('A');

    // The party at this point is open and activate (see expects above), however setTitle seems to be hanging forever
    await partyA.setTitle('A2');
    expect(partyA.title).toBe('A2');
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
    expect(partyA.isActive()).toBe(true);

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
    await partyManagerB.joinHalo(invitation, secretProviderDevice);
    expect(identityManagerB.halo).toBeDefined();
    await waitForCondition(() => partyManagerB.parties.length, 1000);
    expect(partyManagerB.parties.length).toBe(1);
    const partyB = new Party(partyManagerB.parties[0]);

    // C joins as another device of A, seed phrase recovery.

    await partyManagerC.recoverHalo(seedPhrase);
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

    await partyManagerB.joinHalo(invitation, secretProviderDevice);
    expect(identityManagerB.halo).toBeDefined();

    await waitForCondition(() => partyManagerB.parties.length, 1000);
    expect(partyManagerB.parties.length).toBe(1);
    const partyB = new Party(partyManagerB.parties[0]);

    // C joins as another device of A, seed phrase recovery.

    await partyManagerC.recoverHalo(seedPhrase);
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
