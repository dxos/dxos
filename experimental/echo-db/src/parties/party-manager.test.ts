//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import ram from 'random-access-memory';

import { createPartyGenesisMessage, KeyType, Keyring } from '@dxos/credentials';
import { FeedStore } from '@dxos/feed-store';
import { ObjectModel } from '@dxos/experimental-object-model';
import { codec } from '@dxos/experimental-echo-protocol';
import { ModelFactory } from '@dxos/experimental-model-factory';
import { createWritableFeedStream, latch } from '@dxos/experimental-util';

import { PartyManager } from './party-manager';

const log = debug('dxos:echo:party-manager-test');
debug.enable('dxos:echo:*');

// Create raw parties.
const createRawParty = async (feedStore: FeedStore) => {
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
  return feedStream.write(createPartyGenesisMessage(keyring, partyKey, feedKey, identityKey));
};

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
    await createRawParty(feedStore);

    await update;
  });

  test('Create from cold start', async () => {
    const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
    await feedStore.open();

    const numParties = 3;
    {
      let i = 0;
      while (i++ < numParties) {
        await createRawParty(feedStore);
      }
    }

    // Open.
    const modelFactory = new ModelFactory().registerModel(ObjectModel.meta, ObjectModel);
    const partyManager = new PartyManager(feedStore, modelFactory);
    await partyManager.open();

    expect(partyManager.parties).toHaveLength(numParties);
  });
});
