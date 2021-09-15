//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import pify from 'pify';

import { PublicKey } from '@dxos/crypto';

import { MetadataStore } from './metadata-store';
import { IStorage } from '@dxos/random-access-multi-storage';

import { createStorage } from "@dxos/random-access-multi-storage";
import { inMemory } from "./metadata-store.blueprint-test";
import { sleep } from '@dxos/async';

// inMemory(() => createStorage('metadata', 'idb'));

it('open & close', async () => {
  const storage = createStorage('metadata', 'idb')
  const file = storage.createOrOpen('EchoMetadata');
  await pify(file.close.bind(file))();

  const file2 = storage.createOrOpen('EchoMetadata');
  await pify(file2.close.bind(file))();
})

it.only('open & close & read & write', async () => {
  // open
  const storage = createStorage('metadata', 'idb')
  const file = storage.createOrOpen('EchoMetadata');
  
  // read & close
  const { size } = await pify(file.stat.bind(file))();
  const data = await pify(file.read.bind(file))(0, size);
  await pify(file.close.bind(file))();


  // open again
  const file2 = storage.createOrOpen('EchoMetadata');
  // write & close
  // let newData = Buffer.from('0x123')
  // await pify(file2.write.bind(file2))(0, newData);
  const { size2 } = await pify(file2.stat.bind(file2))();
  const data2 = await pify(file2.read.bind(size2))(0, size2);
  await pify(file2.close.bind(file2))();
})

it('Creates party and adds feeds to it', async () => {
  const store = new MetadataStore(createStorage('metadata', 'idb'));

  await store.load();
  expect(store.parties?.length).toBe(0);

  const partyKey = PublicKey.random();
  await store.addParty(partyKey);
  // expect(store.parties?.length).toBe(1);
  // expect(store.parties?.[0].key).toEqual(partyKey);
  // expect(store.parties?.[0].feedKeys?.length ?? 0).toBe(0);
});
