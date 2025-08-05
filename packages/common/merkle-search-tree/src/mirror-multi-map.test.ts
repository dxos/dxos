//
// Copyright 2024 DXOS.org
//

import { inspect } from 'util';

import { test } from 'vitest';

import { range } from '@dxos/util';

import type { ActorID } from './common';
import { MirrorMultiMap } from './mirror-multi-map';
import { randomKey } from './testing';

test('insert and diff', async ({ expect }) => {
  const map: MirrorMultiMap<string> = await MirrorMultiMap.new({ actor: 'peer1' as ActorID });

  await map.setLocalBatch([
    ['a', '1'],
    ['b', '2'],
    ['c', '3'],
  ]);

  await map.setForBatch('peer2' as ActorID, [
    ['a', '1'],
    ['b', '3'],
    ['d', '4'],
  ]);

  const diff = await map.getDifferent();

  expect(diff).toEqual(
    new Map([
      [
        'b',
        new Map([
          ['peer1', '2'],
          ['peer2', '3'],
        ]),
      ],
      ['c', new Map([['peer1', '3']])],
      ['d', new Map([['peer2', '4']])],
    ]),
  );
});

test('sync', async ({ expect }) => {
  const peer1: MirrorMultiMap<string> = await MirrorMultiMap.new({ actor: 'peer1' as ActorID });
  const peer2: MirrorMultiMap<string> = await MirrorMultiMap.new({ actor: 'peer2' as ActorID });

  await peer1.setLocalBatch([
    ['a', '1'],
    ['b', '2'],
    ['c', '3'],
  ]);

  await peer2.setLocalBatch([
    ['a', '1'],
    ['b', '3'],
    ['d', '4'],
  ]);

  await sync(peer1, peer2);

  expect(await peer1.getAll('a')).toEqual(
    new Map([
      ['peer1', '1'],
      ['peer2', '1'],
    ]),
  );
  expect(await peer1.getAll('b')).toEqual(
    new Map([
      ['peer1', '2'],
      ['peer2', '3'],
    ]),
  );
  expect(await peer1.getAll('c')).toEqual(
    new Map([
      ['peer1', '3'],
      ['peer2', undefined],
    ]),
  );
  expect(await peer1.getAll('d')).toEqual(
    new Map([
      ['peer1', undefined],
      ['peer2', '4'],
    ]),
  );
});

test('efficiency', { timeout: 60_000 }, async ({ expect }) => {
  const NUM_KEYS = 1000;
  const NUM_ITERS = 5;
  const NUM_MUTATIONS = 5;

  const peer1 = await MirrorMultiMap.new<string>({ actor: 'peer1' as ActorID });
  const peer2 = await MirrorMultiMap.new<string>({ actor: 'peer2' as ActorID });

  const keys = range(NUM_KEYS).map((i) => `key${i}`);

  console.log({ NUM_KEYS, NUM_ITERS, NUM_MUTATIONS });

  const seed = keys.map((key) => [key, '1'] as const);
  await peer1.setLocalBatch(seed);
  await peer2.setLocalBatch(seed);

  for (const _ of range(NUM_ITERS)) {
    const mut1 = getRandomMutations(keys, NUM_MUTATIONS);
    const mut2 = getRandomMutations(keys, NUM_MUTATIONS);

    // Diverge
    await peer1.setLocalBatch(mut1);
    await peer2.setLocalBatch(mut2);
    console.log('mst', await sync(peer1, peer2));
    console.log('full-state', { items: NUM_KEYS * 2 });

    // Converge
    await peer1.setLocalBatch(dedup([...mut2, ...mut1]));
    await peer2.setLocalBatch(dedup([...mut2, ...mut1]));

    try {
      expect(peer1.currentRoot).toEqual(peer2.currentRoot);
    } catch (err) {
      console.log('Tree 1:\n');
      console.log(peer1.forest.formatToString(peer1.currentRoot));
      console.log('\n\nTree 2:\n');
      console.log(peer2.forest.formatToString(peer2.currentRoot));
      throw err;
    }
  }
});

const sync = async (peer1: MirrorMultiMap<string>, peer2: MirrorMultiMap<string>, spy = false) => {
  let nodes = 0;
  let items = 0;

  for (let i = 0; i < 15; i++) {
    const message1 = await peer1.generateSyncMessage(peer2.localActorId);
    if (message1) {
      await peer2.receiveSyncMessage(peer1.localActorId, message1);
      nodes += message1.nodes.length;
      items += message1.nodes.reduce((acc, node) => acc + node.items.length, 0);
    }

    const message2 = await peer2.generateSyncMessage(peer1.localActorId);
    if (message2) {
      await peer1.receiveSyncMessage(peer2.localActorId, message2);
      nodes += message2.nodes.length;
      items += message2.nodes.reduce((acc, node) => acc + node.items.length, 0);
    }

    if (spy) {
      console.log(
        inspect(
          {
            msg1: message1,
            msg2: message2,
          },
          false,
          null,
          true,
        ),
      );
    }
    if (!message1 && !message2) {
      return { iterations: i - 1, nodes, items };
    }
  }

  throw new Error('sync failed');
};

const getRandomMutations = (keys: string[], n: number) =>
  dedup(
    range(n).map(() => {
      const key = keys[Math.floor(Math.random() * keys.length)];
      return [key, randomKey()] as const;
    }),
  );

const dedup = (pairs: readonly [string, string][]) =>
  pairs.filter(([k], idx) => pairs.slice(0, idx).every(([k2]) => k !== k2));
