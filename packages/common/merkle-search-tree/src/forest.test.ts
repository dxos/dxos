//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { numericalValues, range } from '@dxos/util';

import { type DigestHex, Forest, type TreeMut } from './forest';
import { createValue, randomKey, randomSample } from './testing';

test('empty', async ({ expect }) => {
  const forest = new Forest();
  const root = await forest.createTree([]);
  expect(await forest.get(root, 'a')).toEqual({ kind: 'missing' });
});

test('two items', async ({ expect }) => {
  const forest = new Forest();
  const root = await forest.createTree([
    ['a', createValue('a')],
    ['b', createValue('b')],
  ]);
  expect(await forest.get(root, 'a')).toEqual({ kind: 'present', value: createValue('a') });
  expect(await forest.get(root, 'b')).toEqual({ kind: 'present', value: createValue('b') });
  expect(await forest.get(root, 'c')).toEqual({ kind: 'missing' });
});

test('overwrite key', async ({ expect }) => {
  const forest = new Forest();
  const tree = forest.treeMut(
    await forest.createTree([
      ['a', createValue('a')],
      ['b', createValue('b')],
    ]),
  );
  const prevRoot = tree.root;
  try {
    expect(await tree.get('a')).toEqual({ kind: 'present', value: createValue('a') });
    expect(await tree.get('b')).toEqual({ kind: 'present', value: createValue('b') });

    await tree.set('b', createValue('new'));
    expect(tree.root !== prevRoot).to.be.true;
    expect(await tree.get('b')).toEqual({ kind: 'present', value: createValue('new') });
  } catch (err) {
    console.log(forest.formatToString(tree.root));
    throw err;
  }
});

test('overwrite 2 keys', async ({ expect }) => {
  const forest = new Forest();
  const tree = forest.treeMut(
    await forest.createTree([
      ['a', createValue('a')],
      ['b', createValue('b')],
    ]),
  );
  const prevRoot = tree.root;
  try {
    expect(await tree.get('a')).toEqual({ kind: 'present', value: createValue('a') });
    expect(await tree.get('b')).toEqual({ kind: 'present', value: createValue('b') });

    await tree.setBatch([
      ['a', createValue('newA')],
      ['b', createValue('newB')],
    ]);
    expect(tree.root !== prevRoot).to.be.true;
    expect(await tree.get('a')).toEqual({ kind: 'present', value: createValue('newA') });
    expect(await tree.get('b')).toEqual({ kind: 'present', value: createValue('newB') });
  } catch (err) {
    console.log(forest.formatToString(tree.root));
    throw err;
  }
});

// Passes
test('builds a sorted tree', { timeout: 60_000 }, async ({ expect }) => {
  const NUM_ITEMS = 500;
  const REPEAT_KEYS = 1;
  const NUM_SAMPLES = 1;
  const ITERATIVE = true;

  const forest = new Forest();

  const validate = (root: DigestHex) => {
    try {
      let prevKey = '';
      for (const { key } of forest.items(root)) {
        expect(prevKey < key).toBeTruthy();
        prevKey = key;
      }
    } catch (err) {
      console.log(forest.formatToString(root));
      throw err;
    }
  };

  const pairs = range(NUM_ITEMS).map(() => [randomKey(), createValue(randomKey())] as const);
  pairs.push(...range(REPEAT_KEYS).map(() => pairs[Math.floor(Math.random() * pairs.length)]));
  for (const _ in range(NUM_SAMPLES)) {
    if (!ITERATIVE) {
      const root = await forest.createTree(pairs.sort(() => Math.random() - 0.5));
      validate(root);
    } else {
      const tree = forest.treeMut(await forest.createTree([]));
      for (const [key, value] of pairs.sort(() => Math.random() - 0.5)) {
        const treeBefore = forest.formatToString(tree.root);
        await tree.set(key, value);
        try {
          validate(tree.root);
        } catch (err) {
          console.log(`\nLast node inserted: ${key}\n\n`);
          console.log(`\nTree before insertion:\n${treeBefore}\n\n`);
          throw err;
        }
      }
    }
  }
  // console.log({ itemHashOps: forest.itemHashOps, nodeHashOps: forest.nodeHashOps })
});

describe('insertion order does not change the root hash', () => {
  test('two items', async ({ expect }) => {
    const forest = new Forest();
    const tree1 = await forest.createTree([
      ['a', createValue('a')],
      ['b', createValue('b')],
    ]);

    const tree2 = await forest.createTree([
      ['b', createValue('b')],
      ['a', createValue('a')],
    ]);
    expect(tree1 === tree2).toBeTruthy();
  });

  // Passes
  test('n items', async ({ expect }) => {
    const NUM_ITEMS = 500;
    const NUM_SAMPLES = 100;

    const forest = new Forest();

    const pairs = range(NUM_ITEMS).map(() => [randomKey(), createValue(randomKey())] as const);
    let firstTree: TreeMut | undefined;
    for (const _ in range(NUM_SAMPLES)) {
      const tree = forest.treeMut(await forest.createTree(pairs.sort(() => Math.random() - 0.5)));
      if (!firstTree) {
        firstTree = tree;
      } else {
        try {
          expect(firstTree.root === tree.root).toBeTruthy();
        } catch (err) {
          console.log('Tree 1:\n');
          console.log(forest.formatToString(firstTree.root));
          console.log('\n\nTree 2:\n');
          console.log(forest.formatToString(tree.root));
          throw err;
        }
      }
    }
  });
});

test.skip('sync', async ({ expect }) => {
  const NUM_ITERS = 100;
  const NUM_ITEMS = 10_000;
  const MUTATIONS_PER_ITER = 1;

  const forest1 = new Forest();
  const forest2 = new Forest();

  const pairs = range(NUM_ITEMS).map(() => [randomKey(), createValue(randomKey())] as const);
  const tree = forest1.treeMut(await forest1.createTree(pairs));
  await forest2.createTree(pairs);

  type Stats = {
    exchanges: number;
    nodes: number;
    items: number;
  };

  const allStats: Stats[] = [];

  let prevRoot: DigestHex;
  for (const _ of range(NUM_ITERS)) {
    prevRoot = tree.root;
    const update = randomSample(pairs, MUTATIONS_PER_ITER).map((pair) => [pair[0], createValue(randomKey())] as const);
    try {
      await tree.setBatch(update);
      expect(tree.root !== prevRoot).to.be.eq(true);
    } catch (err) {
      console.log({ prevRoot, root: tree.root, update });
      console.log('Before insertion 1:\n');
      console.log(forest1.formatToString(prevRoot));
      console.log('\nAfter insertion:\n');
      console.log(forest1.formatToString(tree.root));
      console.log('\nMerged tree:\n');
      console.log(forest1.formatToString(await forest1.createTree(update)));
      throw err;
    }

    const stats: Stats = { exchanges: 0, nodes: 0, items: 0 };
    while (true) {
      const missing = [...forest2.missingNodes(tree.root)];
      if (missing.length === 0) {
        break;
      }
      const nodes = await forest1.getNodes(missing);
      await forest2.insertNodes(nodes);
      stats.exchanges++;
      stats.nodes += nodes.length;
      stats.items += nodes.reduce((acc, node) => acc + node.items.length, 0);
    }
    allStats.push(stats);
  }
  console.log({
    NUM_ITEMS,
    MUTATIONS_PER_ITER,
    exchanges: numericalValues(allStats, (x) => x.exchanges),
    nodes: numericalValues(allStats, (x) => x.nodes),
    items: numericalValues(allStats, (x) => x.items),
  });
});

// test('getLevel', ({ expect }) => {
//   expect(getLevel(new Uint8Array([0xff, 0xff]))).toEqual(0);
//   expect(getLevel(new Uint8Array([0x0f, 0xff]))).toEqual(1);
//   expect(getLevel(new Uint8Array([0x00, 0xff]))).toEqual(2);
//   expect(getLevel(new Uint8Array([0x00, 0x0f]))).toEqual(3);
//   expect(getLevel(new Uint8Array([0x00, 0x00]))).toEqual(4);
//   expect(getLevel(new Uint8Array([0xf0, 0x00]))).toEqual(0);
// });
