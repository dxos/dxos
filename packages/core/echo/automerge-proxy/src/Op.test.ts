//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Op from './Op.ts';
import { createRandom, initialDocument, randomOp } from './testing/index.ts';

describe('Op.freeze', () => {
  test('refuses what Automerge refuses when a document is created from a value', () => {
    expect(() => Op.freeze({ title: undefined })).toThrow(/undefined at \/title/);
    expect(() => Op.freeze({ list: [1, undefined] })).toThrow(/undefined at \/list\/1/);
    const sparse = new Array<number>(2);
    sparse[0] = 1;
    expect(() => Op.freeze({ list: sparse })).toThrow(/undefined at \/list\/1/);
  });

  test('copies containers once and shares frozen ones', () => {
    const inner = Op.freeze({ text: 'hello' });
    const outer = Op.freeze({ inner, list: [inner] });
    expect(Object.isFrozen(outer)).toBe(true);
    expect(outer.inner).toBe(inner);
    expect(outer.list[0]).toBe(inner);
  });
});

describe('Op.invert', () => {
  test('undoes random op lists on nested documents', () => {
    const seeds = Number(process.env.OP_FUZZ_SEEDS ?? 3000);
    for (let seed = 1; seed <= seeds; seed++) {
      const random = createRandom(seed);
      let root: unknown = Op.freeze(initialDocument());
      for (let step = 0; step < random.int(6); step++) {
        const op = randomOp(random, root);
        if (op) {
          root = Op.apply(root, [op], { strict: true }).root;
        }
      }
      const ops: Op.Any[] = [];
      for (let count = 1 + random.int(4); count > 0; count--) {
        const op = randomOp(random, Op.apply(root, ops).root);
        if (op) {
          ops.push(op);
        }
      }
      const after = Op.apply(root, ops, { strict: true }).root;
      const undone = Op.apply(after, Op.invert(root, ops), { strict: true }).root;
      if (!Op.equals(undone, root)) {
        throw new Error(`seed ${seed}\nroot ${JSON.stringify(root)}\nops ${JSON.stringify(ops)}`);
      }
    }
  });

  test('skips an op that does not fit, which changed nothing', () => {
    const root = Op.freeze({ text: 'abc' });
    expect(
      Op.invert(root, [
        { type: 'put', path: ['missing', 'key'], value: 1 },
        { type: 'splice', path: ['text'], index: 1, remove: 1, insert: 'XY' },
      ]),
    ).toEqual([{ type: 'splice', path: ['text'], index: 1, remove: 2, insert: 'b' }]);
  });
});
