//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import expect from 'expect';
import { it as test } from 'mocha';

import { createFeedAdmitMessage, createPartyGenesisMessage, Keyring, KeyType } from '@dxos/credentials';
import { createKeyPair, PublicKey } from '@dxos/crypto';
import { codec } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { createStorage, STORAGE_RAM } from '@dxos/random-access-multi-storage';
import { afterTest } from '@dxos/testutils';

import { SnapshotStore } from '../snapshots';
import { FeedStoreAdapter } from '../util';
import { PartyCore } from './party-core';

const setup = async () => {
  const storage = createStorage('', STORAGE_RAM)
  const feedStore = new FeedStore(storage, { valueEncoding: codec });
  await feedStore.open();
  afterTest(async () => feedStore.close());

  const keyring = new Keyring();

  const feedStoreAdapter = new FeedStoreAdapter(feedStore, keyring, storage);
  const modelFactory = new ModelFactory().registerModel(ObjectModel);
  const snapshotStore = new SnapshotStore(createStorage('', STORAGE_RAM));

  const partyKey = await keyring.createKeyRecord({ type: KeyType.PARTY });

  const party = new PartyCore(
    partyKey.publicKey,
    feedStoreAdapter,
    modelFactory,
    snapshotStore
  );

  const { publicKey, secretKey } = createKeyPair();
  const key = PublicKey.from(publicKey);
  const feedKey = await keyring.addKeyRecord({
    type: KeyType.FEED,
    publicKey: key,
    secretKey
  });
  await feedStore.createReadWriteFeed({
    key,
    secretKey,
    metadata: { partyKey: partyKey.publicKey.asBuffer(), writable: true }
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

test('create item with parent and then reload', async () => {
  const { party } = await setup();

  {
    const parent = await party.database.createItem({ model: ObjectModel, type: 'parent' });
    const child = await party.database.createItem({
      model: ObjectModel,
      parent: parent.id,
      type: 'child'
    });

    expect(child.parent).toEqual(parent);
    expect(parent.children).toContain(child);
  }

  await party.close();
  await party.open();

  {
    await party.database.select(s => s.items).update.waitFor(items => items.length === 2);
    const parent = party.database.select(s => s.filter({ type: 'parent' }).items).expectOne();
    const child = party.database.select(s => s.filter({ type: 'child' }).items).expectOne();

    expect(child.parent).toEqual(parent);
    expect(parent.children).toContain(child);
  }
});
