//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import ram from 'random-access-memory';

import { createKeyPair, keyToString } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';
import { ObjectModel } from '@dxos/experimental-object-model';
import { codec, createPartyGenesis } from '@dxos/experimental-echo-protocol';
import { ModelFactory } from '@dxos/experimental-model-factory';
import { createWritableFeedStream, latch } from '@dxos/experimental-util';

import { PartyManager } from './party-manager';

const log = debug('dxos:echo:party-manager-test');
debug.enable('dxos:echo:*');

describe('Party manager', () => {
  test('Created locally', async () => {
    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
    const modelFactory = new ModelFactory().registerModel(ObjectModel.meta, ObjectModel);
    const partyManager = new PartyManager(feedStore, modelFactory);
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
    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
    const modelFactory = new ModelFactory().registerModel(ObjectModel.meta, ObjectModel);
    const partyManager = new PartyManager(feedStore, modelFactory);
    await partyManager.open();

    const [update, setUpdated] = latch();
    const unsubscribe = partyManager.update.on((party) => {
      log('Open:', String(party));
      expect(party.isOpen).toBeTruthy();
      unsubscribe();
      setUpdated();
    });

    // Create raw party.
    const { publicKey: partyKey } = createKeyPair();
    const feed = await feedStore.openFeed(keyToString(partyKey), { metadata: { partyKey } } as any);
    const feedStream = createWritableFeedStream(feed);
    await feedStream.write(createPartyGenesis(partyKey, feed.key));

    await update;
  });

  test('Create from cold start', async () => {
    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
    await feedStore.open();

    // Create raw parties.
    // TODO(burdon): Create multiple feeds.
    const numParties = 3;
    for (let i = 0; i < numParties; i++) {
      const { publicKey: partyKey } = createKeyPair();
      const feed = await feedStore.openFeed(keyToString(partyKey), { metadata: { partyKey } } as any);
      const feedStream = createWritableFeedStream(feed);
      await feedStream.write(createPartyGenesis(partyKey, feed.key));
    }

    // Open.
    const modelFactory = new ModelFactory().registerModel(ObjectModel.meta, ObjectModel);
    const partyManager = new PartyManager(feedStore, modelFactory);
    await partyManager.open();

    expect(partyManager.parties).toHaveLength(numParties);
  });
});
