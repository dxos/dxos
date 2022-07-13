//
// Copyright 2020 DXOS.org
//

/* eslint-disable jest/no-conditional-expect */

import assert from 'assert';
import debug from 'debug';
import expect from 'expect';
import { it as test } from 'mocha';

import { latch } from '@dxos/async';
import {
  createPartyGenesisMessage,
  defaultSecretProvider,
  Keyring, KeyType,
  SecretProvider,
  SecretValidator
} from '@dxos/credentials';
import {
  createKeyPair,
  humanize,
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
import { PublicKey } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-multi-storage';
import { afterTest, testTimeout } from '@dxos/testutils';

import { defaultInvitationAuthenticator, OfflineInvitationClaimer } from '../invitations';
import { Item } from '../packlets/database';
import { MetadataStore, PartyFeedProvider } from '../pipeline';
import { createTestIdentityCredentials } from '../protocol/identity-credentials';
import { SnapshotStore } from '../snapshots';
import { messageLogger } from '../testing';
import { PARTY_ITEM_TYPE } from './data-party';
import { PartyFactory } from './party-factory';
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
  const keyring = new Keyring();

  const storage = createStorage('', StorageType.RAM);
  const snapshotStore = new SnapshotStore(storage.directory('snapshots'));
  const metadataStore = new MetadataStore(storage.directory('metadata'));
  const feedStore = new FeedStore(storage.directory('feed'), { valueEncoding: codec });
  const modelFactory = new ModelFactory().registerModel(ObjectModel);
  const networkManager = new NetworkManager();
  const feedProviderFactory = (partyKey: PublicKey) => new PartyFeedProvider(metadataStore, keyring, feedStore, partyKey);

  const identity = await createTestIdentityCredentials(keyring);
  const partyFactory = new PartyFactory(
    () => identity,
    networkManager,
    modelFactory,
    snapshotStore,
    feedProviderFactory,
    metadataStore,
    {
      writeLogger: messageLogger('<<<'),
      readLogger: messageLogger('>>>')
    }
  );
  const partyManager = new PartyManager(metadataStore, snapshotStore, () => identity, partyFactory);
  await partyManager.open();
  afterTest(() => partyManager.close());

  return { feedStore, partyManager, identity };
};

describe('Party manager', () => {
  // eslint-disable-next-line jest/expect-expect
  test('It exits cleanly', async () => {
    await setup();
  });

  test('Created locally', async () => {
    const { partyManager, identity } = await setup();

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
    const { feed } = await feedStore.openReadWriteFeed(PublicKey.from(publicKey), secretKey);
    const feedKey = await keyring.addKeyRecord({
      publicKey: PublicKey.from(feed.key),
      secretKey: feed.secretKey,
      type: KeyType.FEED
    });

    const feedStream = createWritableFeedStream(feed);
    feedStream.write(createPartyGenesisMessage(keyring, partyKey, feedKey.publicKey, identityKey));

    await partyManager.addParty(partyKey.publicKey, [PublicKey.from(feed.key)]);

    await update;
  });

  test('Create from cold start', async () => {
    const storage = createStorage('', StorageType.RAM);
    const feedStore = new FeedStore(storage.directory('feed'), { valueEncoding: codec });
    const keyring = new Keyring();
    const snapshotStore = new SnapshotStore(storage.directory('snapshots'));
    const metadataStore = new MetadataStore(storage.directory('metadata'));
    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const networkManager = new NetworkManager();
    const feedProviderFactory = (partyKey: PublicKey) => new PartyFeedProvider(metadataStore, keyring, feedStore, partyKey);

    const identity = await createTestIdentityCredentials(keyring);
    const partyFactory = new PartyFactory(
      () => identity,
      networkManager,
      modelFactory,
      snapshotStore,
      feedProviderFactory,
      metadataStore
    );
    const partyManager = new PartyManager(metadataStore, snapshotStore, () => identity, partyFactory);

    /* TODO(telackey): Injecting "raw" Parties into the feeds behind the scenes seems fishy to me, as it writes the
     * Party messages in a slightly different way than the code inside PartyFactory does, and so could easily diverge
     * from reality. Perhaps the thing to do would be to setup temporary storage, add the Parties in the usual way
     * via PartyManager/PartyFactory, close everything, and then compare the end-state after re-opening using the
     * same storage.
     */

    // Create raw parties.
    const numParties = 3;
    for (let i = 0; i < numParties; i++) {
      const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });
      const keyRecord = keyring.getFullKey(partyKey.publicKey);
      assert(keyRecord, 'Key is not found in keyring');
      assert(keyRecord.secretKey, 'Missing secret key');
      await metadataStore.addPartyFeed(partyKey.publicKey, keyRecord.publicKey);

      // TODO(burdon): Create multiple feeds.
      const { feed } = await feedStore.openReadWriteFeed(keyRecord.publicKey, keyRecord.secretKey);
      const feedKey = keyring.getFullKey(feed.key);
      assert(feedKey);

      const feedStream = createWritableFeedStream(feed);
      feedStream.write({
        timeframe: new Timeframe(),
        halo: createPartyGenesisMessage(
          keyring,
          partyKey,
          feedKey.publicKey,
          identity.identityKey
        )
      });
      feedStream.write({
        timeframe: new Timeframe(),
        echo: checkType<EchoEnvelope>({
          itemId: 'foo',
          genesis: {
            itemType: PARTY_ITEM_TYPE,
            modelType: ObjectModel.meta.type
          }
        })
      });
    }

    // Open.
    await partyManager.open();
    expect(partyManager.parties).toHaveLength(numParties);
    await partyManager.close();
  });

  // eslint-disable-next-line jest/expect-expect
  test('Creates invitation and exits cleanly', async () => {
    const { partyManager: partyManagerA } = await setup();

    const partyA = await partyManagerA.createParty();
    const PIN = Buffer.from('0000');
    const secretProvider: SecretProvider = async () => PIN;
    const secretValidator: SecretValidator = async (invitation, secret) => secret.equals(PIN);
    await partyA.invitationManager.createInvitation({ secretProvider, secretValidator }, { expiration: Date.now() + 1000 });
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
    partyB.database.select({ type: 'example:item/test' }).exec()
      .update.on(result => {
        const [itemB] = result.entities;
        if (itemA && itemA.id === itemB.id) {
          log(`B has ${itemB.id}`);
          onUpdate();
        }
      });

    const itemA = await partyA.database.createItem({ model: ObjectModel, type: 'example:item/test' });
    log(`A created ${itemA.id}`);
    await updated;
  });

  test('Join a party - PIN', async () => {
    const { partyManager: partyManagerA, identity: identityA } = await setup();
    const { partyManager: partyManagerB, identity: identityB } = await setup();

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
    partyB.database.select({ type: 'example:item/test' }).exec()
      .update.on(result => {
        if (result.entities.length) {
          const [itemB] = result.entities;
          if (itemA && itemA.id === itemB.id) {
            log(`B has ${itemB.id}`);
            onUpdate();
          }
        }
      });

    // Create a new Item on A.
    itemA = await partyA.database.createItem({ model: ObjectModel, type: 'example:item/test' });
    log(`A created ${itemA.id}`);

    // Now wait to see it on B.
    await updated;

    // Check Party membership and displayName.
    for (const party of [partyA, partyB]) {
      const members = party.queryMembers().value;
      expect(members.length).toBe(2);
      for (const member of members) {
        if (identityA.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(humanize(identityA.identityKey!.publicKey));
          expect(member.displayName).toEqual(identityA.displayName);
        }
        if (identityB.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(humanize(identityB.identityKey!.publicKey));
          expect(member.displayName).toEqual(identityB.displayName);
        }
      }
    }

    expect(inviterOnFinishCalled).toBeTruthy();
  });

  test('Join a party - signature', async () => {
    const { partyManager: partyManagerA, identity: identityA } = await setup();
    const { partyManager: partyManagerB, identity: identityB } = await setup();

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
    partyB.database.select({ type: 'example:item/test' }).exec()
      .update.on(result => {
        if (result.entities.length) {
          const [itemB] = result.entities;
          if (itemA && itemA.id === itemB.id) {
            log(`B has ${itemB.id}`);
            onUpdate();
          }
        }
      });

    // Create a new Item on A.
    itemA = await partyA.database.createItem({ model: ObjectModel, type: 'example:item/test' }) as Item<any>;
    log(`A created ${itemA.id}`);

    // Now wait to see it on B.
    await updated;

    // Check Party membership and displayName.
    for (const party of [partyA, partyB]) {
      const members = party.queryMembers().value;
      expect(members.length).toBe(2);
      for (const member of members) {
        if (identityA.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(humanize(identityA.identityKey!.publicKey));
        }
        if (identityB.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(humanize(identityB.identityKey!.publicKey));
        }
      }
    }
  });

  test('Join a party - Offline', async () => {
    const { partyManager: partyManagerA, identity: identityA } = await setup();
    const { partyManager: partyManagerB, identity: identityB } = await setup();

    // Create the Party.
    expect(partyManagerA.parties).toHaveLength(0);
    const partyA = await partyManagerA.createParty();
    expect(partyManagerA.parties).toHaveLength(1);
    log(`Created ${partyA.key.toHex()}`);

    const invitationDescriptor = await partyA.invitationManager
      .createOfflineInvitation(identityB.identityKey!.publicKey);

    // Redeem the invitation on B.
    expect(partyManagerB.parties).toHaveLength(0);
    const partyB = await partyManagerB.joinParty(invitationDescriptor,
      OfflineInvitationClaimer.createSecretProvider(identityB.createCredentialsSigner()));
    expect(partyB).toBeDefined();
    log(`Joined ${partyB.key.toHex()}`);

    let itemA: Item<any> | null = null;
    const [updated, onUpdate] = latch();

    // Subscribe to Item updates on B.
    partyB.database.select({ type: 'example:item/test' }).exec()
      .update.on(result => {
        if (result.entities.length) {
          const [itemB] = result.entities;
          if (itemA && itemA.id === itemB.id) {
            log(`B has ${itemB.id}`);
            onUpdate();
          }
        }
      });

    // Create a new Item on A.
    itemA = await partyA.database.createItem({ model: ObjectModel, type: 'example:item/test' }) as Item<any>;
    log(`A created ${itemA.id}`);

    // Now wait to see it on B.
    await updated;

    // Check Party membership and displayName.
    for (const party of [partyA, partyB]) {
      const members = party.queryMembers().value;
      expect(members.length).toBe(2);
      for (const member of members) {
        if (identityA.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(humanize(identityA.identityKey!.publicKey));
          expect(member.displayName).toEqual(identityA.displayName);
        }
        if (identityB.identityKey!.publicKey.equals(member.publicKey)) {
          expect(member.displayName).toEqual(humanize(identityB.identityKey!.publicKey));
          expect(member.displayName).toEqual(identityB.displayName);
        }
      }
    }
  }).timeout(10_000);

  test('3 peers in a party', async () => {
    const { partyManager: partyManagerA } = await setup();
    const { partyManager: partyManagerB } = await setup();
    const { partyManager: partyManagerC } = await setup();

    const partyA = await partyManagerA.createParty();

    const invitationA = await partyA.invitationManager.createInvitation(defaultInvitationAuthenticator);
    const partyB = await partyManagerB.joinParty(invitationA, defaultSecretProvider);

    const invitationB = await partyB.invitationManager.createInvitation(defaultInvitationAuthenticator);
    const partyC = await partyManagerC.joinParty(invitationB, defaultSecretProvider);

    await partyA.database.createItem({ type: 'test:item-a' });
    await partyB.database.createItem({ type: 'test:item-b' });
    await partyC.database.createItem({ type: 'test:item-c' });

    for (const party of [partyA, partyB, partyC]) {
      await testTimeout(party.database.waitForItem({ type: 'test:item-a' }));
      await testTimeout(party.database.waitForItem({ type: 'test:item-b' }));
      await testTimeout(party.database.waitForItem({ type: 'test:item-c' }));
    }
  });

  test('Clone party', async () => {
    const { partyManager } = await setup();

    const original = await partyManager.createParty();
    const item1 = await original.database.createItem({ model: ObjectModel });
    const item2 = await original.database.createItem({ model: ObjectModel, parent: item1.id, type: 'example' });
    await item2.model.set('foo', 'bar');

    const clone = await partyManager.cloneParty(original.createSnapshot());
    expect(clone.key.equals(original.key)).toBe(false);
    const item = await clone.database.getItem(item2.id);
    assert(item);
    expect(item.model.get('foo')).toBe('bar');
    expect(item.parent).toBeDefined();
  });
});
