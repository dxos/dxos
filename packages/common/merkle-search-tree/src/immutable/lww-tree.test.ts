import { test } from 'vitest';
import { LWWTree, initSyncState, type ActorID, type SyncMessage } from './lww-tree';
import { range } from '@dxos/util';
import { randomKey } from '../testing';

test('basic', async ({ expect }) => {
  const peer1: LWWTree<string> = await LWWTree.new({ actor: 'peer1' as ActorID });
  const peer2: LWWTree<string> = await LWWTree.new({ actor: 'peer2' as ActorID });

  await peer1.set('a', '1');
  await peer2.set('b', '2');
  await sync(peer1, peer2);
  expect(await peer1.get('a')).toBe('1');
  expect(await peer2.get('a')).toBe('1');
  expect(await peer1.get('b')).toBe('2');
  expect(await peer2.get('b')).toBe('2');

  await peer1.set('a', '3');
  await peer2.set('a', '4');
  await sync(peer1, peer2);
  expect(await peer1.get('a')).toBe('4');
  expect(await peer2.get('a')).toBe('4');
});

test.only('sim', { timeout: 60_000 }, async ({ expect }) => {
  const NUM_KEYS = 50_000,
    NUM_ITERS = 10,
    NUM_MUTATIONS = 1;
  const keys = range(NUM_KEYS).map((i) => `key${i}`);

  const peer1 = await LWWTree.new<string>({ actor: 'peer1' as ActorID });
  const peer2 = await LWWTree.new<string>({ actor: 'peer2' as ActorID });

  // Seed.
  await peer1.setBatch(keys.map((key) => [key, '1']));
  await sync(peer1, peer2);

  // Run.
  for (const _ of range(NUM_ITERS)) {
    for (const _ of range(NUM_MUTATIONS)) {
      const key = keys[Math.floor(Math.random() * keys.length)];
      await peer1.set(key, randomKey());
    }
    for (const _ of range(NUM_MUTATIONS)) {
      const key = keys[Math.floor(Math.random() * keys.length)];
      await peer2.set(key, randomKey());
    }
    console.log(await sync(peer1, peer2));
  }
});

const sync = async (peer1: LWWTree<string>, peer2: LWWTree<string>) => {
  let state1 = initSyncState(),
    state2 = initSyncState();

  let nodes = 0,
    items = 0;

  for (let i = 0; i < 15; i++) {
    let message1: SyncMessage | null = null,
      message2: SyncMessage | null = null;
    // console.log('state1', state1);
    [state1, message1] = await peer1.generateSyncMessage(state1);
    if (message1) {
      // console.log('1 -> 2', { ...message1, nodes: message1.nodes.map((node) => ({ ...node, items: undefined })) });

      state2 = await peer2.receiveSyncMessage(state2, message1);
      nodes += message1.nodes.length;
      items += message1.nodes.reduce((acc, node) => acc + node.items.length, 0);
    }
    // console.log('state2', state2);

    [state2, message2] = await peer2.generateSyncMessage(state2);
    if (message2) {
      // console.log('2 -> 1', { ...message2, nodes: message2.nodes.map((node) => ({ ...node, items: undefined })) });
      state1 = await peer1.receiveSyncMessage(state1, message2);
      nodes += message2.nodes.length;
      items += message2.nodes.reduce((acc, node) => acc + node.items.length, 0);
    }

    if (!message1 && !message2) {
      // console.log(`synced in ${i - 1} iterations`);
      return { iterations: i - 1, nodes, items };
    }
  }
  throw new Error('sync failed');
};
