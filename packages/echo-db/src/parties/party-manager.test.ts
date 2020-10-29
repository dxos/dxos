//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import ram from 'random-access-memory';

import { createPartyGenesisMessage, KeyType, Keyring, generateSeedPhrase, keyPairFromSeedPhrase } from '@dxos/credentials';
import {
  keyToBuffer,
  randomBytes,
  sign,
  verify,
  SIGNATURE_LENGTH,
  createKeyPair,
  keyToString,
  humanize
} from '@dxos/crypto';
import { codec } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager, SwarmProvider } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { createWritableFeedStream, latch } from '@dxos/util';

import { FeedStoreAdapter } from '../feed-store-adapter';
import { InvitationDescriptor, SecretProvider, SecretValidator } from '../invitations';
import { Item } from '../items';
import { SnapshotStore } from '../snapshot-store';
import { messageLogger } from '../testing';
import { IdentityManager } from './identity-manager';
import { Party } from './party';
import { PartyFactory } from './party-factory';
import { PartyManager } from './party-manager';

const log = debug('dxos:echo:parties:party-manager:test');

describe('Party manager', () => {
  const setup = async (open = true, createIdentity = true) => {
    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
    const feedStoreAdapter = new FeedStoreAdapter(feedStore);
    let seedPhrase;

    let identityManager;
    {
      const keyring = new Keyring();
      if (createIdentity) {
        seedPhrase = generateSeedPhrase();
        const keyPair = keyPairFromSeedPhrase(seedPhrase);
        await keyring.addKeyRecord({ ...keyPair, type: KeyType.IDENTITY });
      }
      identityManager = new IdentityManager(keyring);
    }

    const snapshotStore = new SnapshotStore(ram);
    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const partyFactory = new PartyFactory(
      identityManager,
      feedStoreAdapter,
      modelFactory,
      new NetworkManager(feedStore, new SwarmProvider()),
      snapshotStore,
      {
        writeLogger: messageLogger('<<<'),
        readLogger: messageLogger('>>>')
      }
    );
    const partyManager = new PartyManager(identityManager, feedStoreAdapter, partyFactory, snapshotStore);

    if (open) {
      await partyManager.open();
      if (createIdentity) {
        await partyManager.createHalo({ identityDisplayName: humanize(identityManager.identityKey!.publicKey) });
      }
    }

    return { feedStore, partyManager, identityManager, seedPhrase };
  };

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
    const feed = await feedStore.openFeed(partyKey.key, { metadata: { partyKey: partyKey.publicKey } } as any);
    const feedKey = await keyring.addKeyRecord({
      publicKey: feed.key,
      secretKey: feed.secretKey,
      type: KeyType.FEED
    });

    const feedStream = createWritableFeedStream(feed);
    feedStream.write(createPartyGenesisMessage(keyring, partyKey, feedKey, identityKey));

    await partyManager.addParty(keyToBuffer(partyKey.key), [{
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
    const identityManager = new IdentityManager(keyring);

    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const snapshotStore = new SnapshotStore(ram);
    const partyFactory = new PartyFactory(identityManager, feedStoreAdapter, modelFactory, new NetworkManager(feedStore, new SwarmProvider()), snapshotStore);
    const partyManager = new PartyManager(identityManager, feedStoreAdapter, partyFactory, snapshotStore);

    await feedStore.open();

    const numParties = 3;

    // TODO(telackey): Injecting "raw" Parties into the feeds behind the scenes seems fishy to me, as it writes the
    // Party messages in a slightly different way than the code inside PartyFactory does, and so could easily diverge
    // from reality. Perhaps the thing to do would be to setup temporary storage, add the Parties in the usual way
    // via PartyManager/PartyFactory, close everything, and then compare the end-state after re-opening using the
    // same storage.

    // Create raw parties.
    for (let i = 0; i < numParties; i++) {
      const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });

      // TODO(burdon): Create multiple feeds.
      const feed = await feedStore.openFeed(partyKey.key,
        { metadata: { partyKey: partyKey.publicKey, writable: true } } as any);
      const feedKey = await keyring.addKeyRecord({
        publicKey: feed.key,
        secretKey: feed.secretKey,
        type: KeyType.FEED
      });

      const feedStream = createWritableFeedStream(feed);
      feedStream.write({ halo: createPartyGenesisMessage(keyring, partyKey, feedKey, identityKey) });
    }

    // Open.
    await partyManager.open();

    expect(partyManager.parties).toHaveLength(numParties);
  });

  test('Join a party - PIN', async () => {
    const { partyManager: partyManagerA, identityManager: identityManagerA } = await setup();
    const { partyManager: partyManagerB, identityManager: identityManagerB } = await setup();
    await partyManagerA.open();
    await partyManagerB.open();

    const PIN = Buffer.from('0000');

    // Create the Party.
    expect(partyManagerA.parties).toHaveLength(0);
    const partyA = await partyManagerA.createParty();
    expect(partyManagerA.parties).toHaveLength(1);
    log(`Created ${keyToString(partyA.key)}`);

    // Create a validation function which tests the signature of a specific KeyPair.
    const secretValidator: SecretValidator = async (invitation, secret) => secret.equals(PIN);

    // And a provider for the secret.
    // (We reuse the function here, but normally both the Inviter and Invitee would have their own SecretProvider.)
    const secretProvider: SecretProvider = async () => PIN;

    // Issue the invitation to the Party on A.
    const invitationDescriptor = await partyA.createInvitation({ secretProvider, secretValidator });

    // Redeem the invitation on B.
    expect(partyManagerB.parties).toHaveLength(0);
    const partyB = await partyManagerB.joinParty(invitationDescriptor, secretProvider);
    expect(partyB).toBeDefined();
    log(`Joined ${keyToString(partyB.key)}`);

    let itemA: Item<any> | null = null;
    const [updated, onUpdate] = latch();

    // Subscribe to Item updates on B.
    partyB.itemManager?.queryItems({ type: 'wrn://dxos.org/item/test' })
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
    itemA = await partyA.itemManager?.createItem(ObjectModel.meta.type, 'wrn://dxos.org/item/test') as Item<any>;
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
          expect(member.displayName).toEqual(humanize(identityManagerA.identityKey!.publicKey));
          expect(member.displayName).toEqual(identityManagerA.displayName);
        }
        if (identityManagerB.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(humanize(identityManagerB.identityKey!.publicKey));
          expect(member.displayName).toEqual(identityManagerB.displayName);
        }
      }
    }
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
    log(`Created ${keyToString(partyA.key)}`);

    // Create a validation function which tests the signature of a specific KeyPair.
    const secretValidator: SecretValidator = async (invitation, secret) => {
      const signature = secret.slice(0, SIGNATURE_LENGTH);
      const message = secret.slice(SIGNATURE_LENGTH);
      return verify(message, signature, keyPair.publicKey);
    };

    // Issue the invitation to the Party on A.
    const invitationDescriptor = await partyA.createInvitation({ secretValidator });

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
    log(`Joined ${keyToString(partyB.key)}`);

    let itemA: Item<any> | null = null;
    const [updated, onUpdate] = latch();

    // Subscribe to Item updates on B.
    partyB.itemManager?.queryItems({ type: 'wrn://dxos.org/item/test' })
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
    itemA = await partyA.itemManager?.createItem(ObjectModel.meta.type, 'wrn://dxos.org/item/test') as Item<any>;
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
          expect(member.displayName).toEqual(humanize(identityManagerA.identityKey!.publicKey));
        }
        if (identityManagerB.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(humanize(identityManagerB.identityKey!.publicKey));
        }
      }
    }
  });

  test('One user, two devices', async () => {
    const { partyManager: partyManagerA, identityManager: identityManagerA } = await setup(true, true);
    const { partyManager: partyManagerB, identityManager: identityManagerB } = await setup(true, false);

    expect(identityManagerA.halo).toBeDefined();
    expect(identityManagerB.halo).not.toBeDefined();

    const pinSecret = '0000';
    const secretProvider: SecretProvider = async () => Buffer.from(pinSecret);
    const secretValidator: SecretValidator = async (invitation, secret) =>
      secret && secret.equals(invitation.secret);

    // Issue the invitation on nodeA.
    const invitation = await identityManagerA?.halo?.createInvitation({
      secretValidator,
      secretProvider
    }) as InvitationDescriptor;

    // And then redeem it on nodeB.
    await partyManagerB.joinHalo(invitation, secretProvider);

    expect(identityManagerA.halo).toBeDefined();
    expect(identityManagerB.halo).toBeDefined();

    {
      let itemA: Item<any> | null = null;
      const [updated, onUpdate] = latch();

      // Subscribe to Item updates on B.
      identityManagerB.halo?.itemManager?.queryItems({ type: 'wrn://dxos.org/item/test' })
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
      itemA = await identityManagerA.halo?.itemManager?.createItem(ObjectModel.meta.type, 'wrn://dxos.org/item/test') as Item<any>;
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
      partyManagerA.parties[0].itemManager?.queryItems({ type: 'wrn://dxos.org/item/test' })
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
      itemA = await partyManagerB.parties[0].itemManager?.createItem(ObjectModel.meta.type, 'wrn://dxos.org/item/test') as Item<any>;

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
      secret && secret.equals(invitation.secret);

    {
      // Issue the invitation on nodeA.
      const invitation = await identityManagerA1?.halo?.createInvitation({
        secretValidator,
        secretProvider
      }) as InvitationDescriptor;

      // And then redeem it on nodeB.
      await partyManagerA2.joinHalo(invitation, secretProvider);
    }

    {
      // Issue the invitation on node 1.
      const invitation = await identityManagerB1?.halo?.createInvitation({
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

      const invitation = await partyA.createInvitation({ secretProvider, secretValidator });
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
      expect(party.itemManager?.queryItems({ type: 'wrn://dxos.org/item/test' }).value.length).toBe(0);
    }

    for await (const partyManager of [partyManagerA1, partyManagerA2, partyManagerB1, partyManagerB2]) {
      let item: Item<any> | null = null;
      const [party] = partyManager.parties;
      const itemPromises = [];

      for (const otherManager of [partyManagerA1, partyManagerA2, partyManagerB1, partyManagerB2]) {
        if (partyManager !== otherManager) {
          const [otherParty] = otherManager.parties;
          const [updated, onUpdate] = latch();
          otherParty.itemManager?.queryItems({ type: 'wrn://dxos.org/item/test' })
            .subscribe((result) => {
              if (result.find(current => current.id === item?.id)) {
                log(`other has ${item?.id}`);
                onUpdate();
              }
            });
          itemPromises.push(updated);
        }
      }

      item = await party.itemManager?.createItem(ObjectModel.meta.type, 'wrn://dxos.org/item/test') as Item<any>;
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
      identityManagerB.halo?.itemManager?.queryItems({ type: 'wrn://dxos.org/item/test' })
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
      itemA = await identityManagerA.halo?.itemManager?.createItem(ObjectModel.meta.type, 'wrn://dxos.org/item/test') as Item<any>;
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
      partyManagerA.parties[0].itemManager?.queryItems({ type: 'wrn://dxos.org/item/test' })
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
      itemA = await partyManagerB.parties[0].itemManager?.createItem(ObjectModel.meta.type, 'wrn://dxos.org/item/test') as Item<any>;

      // Now wait to see it on A.
      await updated;
    }
  });
});
