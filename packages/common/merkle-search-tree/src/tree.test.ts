import { range } from '@dxos/util';
import { describe, test } from 'vitest';
import { digestEquals, getLevel } from './common';
import { Tree } from './tree';
import { createValue, randomKey } from './testing';

test('empty', async ({ expect }) => {
  const tree = await Tree.build();
  expect(tree.rootDigest.length).toBeGreaterThan(0);
  expect(tree.get('a')).toEqual(undefined);
});

test('two items', async ({ expect }) => {
  const tree = await Tree.build([
    ['a', createValue('a')],
    ['b', createValue('b')],
  ]);
  expect(tree.rootDigest.length).toBeGreaterThan(0);
  expect(tree.get('a')).toEqual(createValue('a'));
  expect(tree.get('b')).toEqual(createValue('b'));
  expect(tree.get('c')).toEqual(undefined);
});

test('overwrite key', async ({ expect }) => {
  const tree = await Tree.build([
    ['a', createValue('a')],
    ['b', createValue('b')],
  ]);
  expect(tree.rootDigest.length).toBeGreaterThan(0);
  expect(tree.get('a')).toEqual(createValue('a'));
  expect(tree.get('b')).toEqual(createValue('b'));

  await tree.set('b', createValue('new'));
  try {
    expect(tree.get('b')).toEqual(createValue('new'));
  } catch (err) {
    console.log(tree.formatToString());
    throw err;
  }
});

test('builds a sorted tree', async ({ expect }) => {
  const NUM_ITEMS = 1000;
  const NUM_SAMPLES = 100;
  const ITERATIVE = false;

  const validate = (tree: Tree) => {
    try {
      let prevKey = '';
      for (const [key] of tree.entries()) {
        expect(prevKey < key).toBeTruthy();
        prevKey = key;
      }
    } catch (err) {
      console.log(tree.formatToString());
      throw err;
    }
  };

  const pairs = range(NUM_ITEMS).map(() => [randomKey(), createValue(randomKey())] as const);
  for (const _ in range(NUM_SAMPLES)) {
    if (!ITERATIVE) {
      const tree = await Tree.build(pairs.sort(() => Math.random() - 0.5));
      validate(tree);
    } else {
      const tree = await Tree.build();
      for (const [key, value] of pairs.sort(() => Math.random() - 0.5)) {
        const treeBefore = tree.formatToString();
        await tree.set(key, value);
        try {
          validate(tree);
        } catch (err) {
          console.log(`\nLast node inserted: ${key}\n\n`);
          console.log(`\Tree before insertion:\n${treeBefore}\n\n`);
          throw err;
        }
      }
    }
  }
});

describe('insertion order does not change the root hash', () => {
  test('two items', async ({ expect }) => {
    const tree1 = await Tree.build([
      ['a', createValue('a')],
      ['b', createValue('b')],
    ]);

    const tree2 = await Tree.build([
      ['b', createValue('b')],
      ['a', createValue('a')],
    ]);
    expect(digestEquals(tree1.rootDigest, tree2.rootDigest)).toBeTruthy();
  });

  test('n items', async ({ expect }) => {
    const NUM_ITEMS = 1000;
    const NUM_SAMPLES = 100;

    const pairs = range(NUM_ITEMS).map(() => [randomKey(), createValue(randomKey())] as const);
    let firstTree: Tree | undefined = undefined;
    for (const _ in range(NUM_SAMPLES)) {
      const tree = await Tree.build(pairs.sort(() => Math.random() - 0.5));
      if (!firstTree) {
        firstTree = tree;
      } else {
        try {
          expect(digestEquals(firstTree.rootDigest, tree.rootDigest)).toBeTruthy();
        } catch (err) {
          console.log('Tree 1:\n');
          console.log(firstTree.formatToString());
          console.log('\n\nTree 2:\n');
          console.log(tree.formatToString());
          throw err;
        }
      }
    }
  });
});

test('getLevel', ({ expect }) => {
  expect(getLevel(new Uint8Array([0xff, 0xff]))).toEqual(0);
  expect(getLevel(new Uint8Array([0x0f, 0xff]))).toEqual(1);
  expect(getLevel(new Uint8Array([0x00, 0xff]))).toEqual(2);
  expect(getLevel(new Uint8Array([0x00, 0x0f]))).toEqual(3);
  expect(getLevel(new Uint8Array([0x00, 0x00]))).toEqual(4);
  expect(getLevel(new Uint8Array([0xf0, 0x00]))).toEqual(0);
});
