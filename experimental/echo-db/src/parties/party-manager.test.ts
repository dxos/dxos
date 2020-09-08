//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import ram from 'random-access-memory';

import { createPartyGenesisMessage, KeyType, Keyring } from '@dxos/credentials';
import { keyToBuffer } from '@dxos/crypto';
import { ModelFactory } from '@dxos/experimental-model-factory';
import { ObjectModel } from '@dxos/experimental-object-model';
import { createWritableFeedStream, latch } from '@dxos/experimental-util';
import { FeedStore } from '@dxos/feed-store';

import { codec } from '../codec';
import { FeedStoreAdapter } from '../feed-store-adapter';
import { PartyFactory } from '../party-factory';
import { PartyManager } from './party-manager';

const log = debug('dxos:echo:party-manager-test');

describe('Party manager', () => {
  const setup = () => {
    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
    const feedStoreAdapter = new FeedStoreAdapter(feedStore);
    const modelFactory = new ModelFactory().registerModel(ObjectModel.meta, ObjectModel);
    const partyFactory = new PartyFactory(feedStoreAdapter, modelFactory, undefined);
    const partyManager = new PartyManager(feedStoreAdapter, partyFactory);
    return { feedStore, partyManager };
  };

  test('Created locally', async () => {
    const { partyManager } = setup();
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

    await update;
  });

  test('Created via sync', async () => {
    const { feedStore, partyManager } = setup();
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
    const { feedStore, partyManager } = setup();
    await feedStore.open();

    const numParties = 3;
    // Create raw parties.
    {
      let i = 0;
      while (i++ < numParties) {
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
      }
    }

    // Open.
    await partyManager.open();

    expect(partyManager.parties).toHaveLength(numParties);
  });
});
