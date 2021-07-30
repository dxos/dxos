//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

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
import { createStorage, STORAGE_RAM } from '@dxos/random-access-multi-storage';

const setup = async () => {
  const feedStore = new FeedStore(createStorage('', STORAGE_RAM), { feedOptions: { valueEncoding: codec } });
  await feedStore.open();
  afterTest(async () => feedStore.close());

  const feedStoreAdapter = new FeedStoreAdapter(feedStore);
  const keyring = new Keyring();
  const modelFactory = new ModelFactory().registerModel(ObjectModel);
  const snapshotStore = new SnapshotStore(createStorage('', STORAGE_RAM));

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

  return { party, feedKey };
};

test('create & have the feed key admitted', async () => {
  const { party, feedKey } = await setup();

  await party.processor.keyOrInfoAdded.waitForCount(1);

  expect(party.processor.isFeedAdmitted(feedKey.publicKey)).toBeTruthy();
});

test('create item', async () => {
  const { party } = await setup();

  const item = await party.database.createItem({ model: ObjectModel });
  await item.model.setProperty('foo', 'bar');

  expect(item.model.getProperty('foo')).toEqual('bar');
});
