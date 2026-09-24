//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type Op, applyOps, freezeValue, invertOps } from './ops.ts';
import { mirrorEquals } from './protocol.ts';
import { createRandom, initialDocument, randomOp } from './testing.ts';

describe('freezeValue', () => {
  test('refuses what Automerge refuses when a document is created from a value', () => {
    expect(() => freezeValue({ title: undefined })).toThrow(/undefined at \/title/);
    expect(() => freezeValue({ list: [1, undefined] })).toThrow(/undefined at \/list\/1/);
    const sparse = new Array<number>(2);
    sparse[0] = 1;
    expect(() => freezeValue({ list: sparse })).toThrow(/undefined at \/list\/1/);
  });

  test('copies containers once and shares frozen ones', () => {
    const inner = freezeValue({ text: 'hello' });
    const outer = freezeValue({ inner, list: [inner] });
    expect(Object.isFrozen(outer)).toBe(true);
    expect(outer.inner).toBe(inner);
    expect(outer.list[0]).toBe(inner);
  });
});

describe('invertOps', () => {
  test('undoes random op lists on nested documents', () => {
    const seeds = Number(process.env.MIRROR_FUZZ_SEEDS ?? 3000);
    for (let seed = 1; seed <= seeds; seed++) {
      const random = createRandom(seed);
      let root: unknown = freezeValue(initialDocument());
      for (let step = 0; step < random.int(6); step++) {
        const op = randomOp(random, root);
        if (op) {
          root = applyOps(root, [op], { strict: true }).root;
        }
      }
      const ops: Op[] = [];
      for (let count = 1 + random.int(4); count > 0; count--) {
        const op = randomOp(random, applyOps(root, ops).root);
        if (op) {
          ops.push(op);
        }
      }
      const after = applyOps(root, ops, { strict: true }).root;
      const undone = applyOps(after, invertOps(root, ops), { strict: true }).root;
      if (!mirrorEquals(undone, root)) {
        throw new Error(`seed ${seed}\nroot ${JSON.stringify(root)}\nops ${JSON.stringify(ops)}`);
      }
    }
  });

  test('skips an op that does not fit, which changed nothing', () => {
    const root = freezeValue({ text: 'abc' });
    expect(
      invertOps(root, [
        { type: 'put', path: ['missing', 'key'], value: 1 },
        { type: 'splice', path: ['text'], index: 1, remove: 1, insert: 'XY' },
      ]),
    ).toEqual([{ type: 'splice', path: ['text'], index: 1, remove: 2, insert: 'b' }]);
  });
});
