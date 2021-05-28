//
// Copyright 2021 DXOS.org
//

import ram from 'random-access-memory';

import { createFeedAdmitMessage, createPartyGenesisMessage, Keyring, KeyType } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { codec } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { afterTest } from '@dxos/testutils';

import { SnapshotStore } from '../snapshots';
import { FeedStoreAdapter } from '../util';
import { PartyCore } from './party-core';

test('create', async () => {
  const feedStore = new FeedStore(ram, { feedOptions: { valueEncoding: codec } });
  await feedStore.open();
  afterTest(async () => feedStore.close());

  const feedStoreAdapter = new FeedStoreAdapter(feedStore);
  const keyring = new Keyring();
  const modelFactory = new ModelFactory().registerModel(ObjectModel);
  const snapshotStore = new SnapshotStore(ram);

  const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });

  const party = new PartyCore(
    partyKey.publicKey,
    feedStoreAdapter,
    modelFactory,
    snapshotStore
  );

  const feed = await feedStoreAdapter.createWritableFeed(partyKey.publicKey);
  const feedKey = await keyring.addKeyRecord({
    publicKey: PublicKey.from(feed.key),
    secretKey: feed.secretKey,
    type: KeyType.FEED
  });

  await party.open();
  afterTest(async () => party.close());

  // PartyGenesis (self-signed by Party)
  await party.processor.writeHaloMessage(createPartyGenesisMessage(
    keyring,
    partyKey,
    feedKey,
    partyKey)
  );

  // FeedAdmit (signed by the Device KeyChain).
  await party.processor.writeHaloMessage(createFeedAdmitMessage(
    keyring,
    partyKey.publicKey,
    feedKey,
    [partyKey]
  ));

  // The Party key is an inception key; its SecretKey must be destroyed once the Party has been created.
  await keyring.deleteSecretKey(partyKey);

  await party.processor.keyOrInfoAdded.waitForCount(1);

  expect(party.processor.isFeedAdmitted(feedKey.publicKey)).toBeTruthy();
}, 10_000);
