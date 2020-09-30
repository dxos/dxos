//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import ram from 'random-access-memory';

import { createPartyGenesisMessage, KeyType, Keyring } from '@dxos/credentials';
import { keyToBuffer } from '@dxos/crypto';
import { codec } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager, SwarmProvider } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { createWritableFeedStream, latch } from '@dxos/util';

import { FeedStoreAdapter } from '../feed-store-adapter';
import { IdentityManager } from './identity-manager';
import { PartyFactory } from './party-factory';
import { PartyManager } from './party-manager';

const log = debug('dxos:echo:party-manager-test');

describe('Party manager', () => {
  const setup = async (open = true) => {
    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
    const feedStoreAdapter = new FeedStoreAdapter(feedStore);

    let identityManager;
    {
      const keyring = new Keyring();
      await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      identityManager = new IdentityManager(keyring);
    }

    const modelFactory = new ModelFactory().registerModel(ObjectModel.meta, ObjectModel);
    const partyFactory = new PartyFactory(identityManager.keyring, feedStoreAdapter, modelFactory, new NetworkManager(feedStore, new SwarmProvider()));
    const partyManager = new PartyManager(identityManager, feedStoreAdapter, partyFactory);

    if (open) {
      await partyManager.open();
      await partyManager.createHalo();
    }

    return { feedStore, partyManager, identityManager };
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

    await partyManager.addParty(keyToBuffer(partyKey.key), [feed.key]);

    await update;
  });

  test('Create from cold start', async () => {
    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
    const feedStoreAdapter = new FeedStoreAdapter(feedStore);

    const keyring = new Keyring();
    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const identityManager = new IdentityManager(keyring);

    const modelFactory = new ModelFactory().registerModel(ObjectModel.meta, ObjectModel);
    const partyFactory = new PartyFactory(identityManager.keyring, feedStoreAdapter, modelFactory, new NetworkManager(feedStore, new SwarmProvider()));
    const partyManager = new PartyManager(identityManager, feedStoreAdapter, partyFactory);

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
});
