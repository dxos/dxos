//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Op from './Op.ts';
import * as Transform from './Transform.ts';

/** A leaf class, as RawString is: stored and compared whole, never merged. */
class Leaf {
  constructor(readonly value: string) {}

  toString(): string {
    return this.value;
  }
}

/** Both orders of applying two concurrent op lists reach the same state (TP1), and every op still applies. */
const converges = (base: unknown, left: Op.Any[], right: Op.Any[], leftFirst: boolean): boolean => {
  const [leftPrime, rightPrime] = Transform.lists(left, right, leftFirst);
  const viaRight = Op.apply(Op.apply(base, right, { strict: true }).root, leftPrime, { strict: true }).root;
  const viaLeft = Op.apply(Op.apply(base, left, { strict: true }).root, rightPrime, { strict: true }).root;
  return Op.equals(viaLeft, viaRight);
};

/** Edge cases an adversarial review of the transforms picked, kept so each stays covered by name. */
describe('transform edge cases', () => {
  const base = Op.freeze({
    text: 'abcdef',
    empty: '',
    leaf: new Leaf('r'),
    list: [{ title: 'zero', items: ['x'] }, { title: 'one', items: [] }, 'two', 'three'],
    map: { 'key': { nested: [1, 2, 3] }, '0': 'numeric key' },
  });

  const cases: [string, Op.Any[], Op.Any[]][] = [
    [
      'splice at the end against splice at the end',
      [{ type: 'splice', path: ['text'], index: 6, remove: 0, insert: 'X' }],
      [{ type: 'splice', path: ['text'], index: 6, remove: 0, insert: 'Y' }],
    ],
    [
      'splice at the end against deleting the tail',
      [{ type: 'splice', path: ['text'], index: 6, remove: 0, insert: 'X' }],
      [{ type: 'splice', path: ['text'], index: 3, remove: 3, insert: '' }],
    ],
    [
      'inserts into an empty text',
      [{ type: 'splice', path: ['empty'], index: 0, remove: 0, insert: 'A' }],
      [{ type: 'splice', path: ['empty'], index: 0, remove: 0, insert: 'B' }],
    ],
    [
      'a no-op splice against deleting everything',
      [{ type: 'splice', path: ['text'], index: 2, remove: 0, insert: '' }],
      [{ type: 'splice', path: ['text'], index: 0, remove: 6, insert: '' }],
    ],
    [
      'overlapping replacements',
      [{ type: 'splice', path: ['text'], index: 1, remove: 3, insert: 'PQ' }],
      [{ type: 'splice', path: ['text'], index: 2, remove: 3, insert: 'RS' }],
    ],
    [
      'put at a list index against a remove covering it',
      [{ type: 'put', path: ['list', 2], value: 'TWO' }],
      [{ type: 'remove', path: ['list', 1], count: 3 }],
    ],
    [
      'put at a list index against an insert at it',
      [{ type: 'put', path: ['list', 2], value: 'TWO' }],
      [{ type: 'insert', path: ['list', 2], values: ['new'] }],
    ],
    [
      'puts at the same list index',
      [{ type: 'put', path: ['list', 2], value: 'A' }],
      [{ type: 'put', path: ['list', 2], value: 'B' }],
    ],
    [
      'removing to the end against appending',
      [{ type: 'remove', path: ['list', 2], count: 2 }],
      [{ type: 'insert', path: ['list', 4], values: ['end'] }],
    ],
    [
      'overlapping removes',
      [{ type: 'remove', path: ['list', 1], count: 3 }],
      [{ type: 'remove', path: ['list', 2], count: 2 }],
    ],
    [
      'deleting a map key against an insert inside it',
      [{ type: 'del', path: ['map', 'key'] }],
      [{ type: 'insert', path: ['map', 'key', 'nested', 0], values: [0] }],
    ],
    [
      'deleting a map key against a put inside it',
      [{ type: 'del', path: ['map', 'key'] }],
      [{ type: 'put', path: ['map', 'key', 'extra'], value: 1 }],
    ],
    [
      'a text in a list element against removing the element',
      [{ type: 'splice', path: ['list', 0, 'title'], index: 4, remove: 0, insert: '!' }],
      [{ type: 'remove', path: ['list', 0], count: 1 }],
    ],
    [
      'a text in a list element against replacing the element',
      [{ type: 'splice', path: ['list', 0, 'title'], index: 0, remove: 1, insert: 'Z' }],
      [{ type: 'put', path: ['list', 0], value: { title: 'replaced' } }],
    ],
    [
      'a text in a list element against moving the element',
      [{ type: 'splice', path: ['list', 0, 'title'], index: 0, remove: 0, insert: '>' }],
      [
        { type: 'remove', path: ['list', 0], count: 1 },
        { type: 'insert', path: ['list', 3], values: [{ title: 'zero', items: ['x'] }] },
      ],
    ],
    [
      'a text that is a list element against an insert before it',
      [{ type: 'splice', path: ['list', 2], index: 3, remove: 0, insert: '?' }],
      [{ type: 'insert', path: ['list', 0], values: ['a', 'b'] }],
    ],
    [
      'a numeric-string map key written by name and by number',
      [{ type: 'put', path: ['map', '0'], value: 'A' }],
      [{ type: 'put', path: ['map', 0], value: 'B' }],
    ],
    [
      'puts of leaf values',
      [{ type: 'put', path: ['leaf'], value: new Leaf('a') }],
      [{ type: 'put', path: ['leaf'], value: new Leaf('b') }],
    ],
    [
      'a remove split by an insert, followed by more ops',
      [
        { type: 'remove', path: ['list', 0], count: 4 },
        { type: 'insert', path: ['list', 0], values: ['fresh'] },
      ],
      [
        { type: 'insert', path: ['list', 2], values: ['mid1', 'mid2'] },
        { type: 'splice', path: ['list', 2], index: 0, remove: 0, insert: '*' },
      ],
    ],
  ];

  for (const [name, left, right] of cases) {
    test(name, () => {
      expect(converges(base, left, right, true)).toBe(true);
      expect(converges(base, left, right, false)).toBe(true);
    });
  }
});

/** Both orders of two concurrent op lists, which TP1 requires to agree. */
const bothOrders = (base: unknown, left: Op.Any[], right: Op.Any[]) => {
  const [leftPrime, rightPrime] = Transform.lists(left, right, true);
  return {
    leftThenRight: Op.apply(Op.apply(base, left, { strict: true }).root, rightPrime, { strict: true }).root,
    rightThenLeft: Op.apply(Op.apply(base, right, { strict: true }).root, leftPrime, { strict: true }).root,
  };
};

/** Automerge keeps a write over a concurrent delete of what it writes, and loses edits inside a deleted value. */
describe('a write beats a concurrent delete', () => {
  test('of a map key', () => {
    const base = Op.freeze({ map: { key: 'old', other: 1 } });
    const { leftThenRight, rightThenLeft } = bothOrders(
      base,
      [{ type: 'put', path: ['map', 'key'], value: 'new' }],
      [{ type: 'del', path: ['map', 'key'] }],
    );
    expect(leftThenRight).toEqual({ map: { key: 'new', other: 1 } });
    expect(rightThenLeft).toEqual(leftThenRight);
  });

  test('of a list element, where the removed range closes up around it', () => {
    const base = Op.freeze({ list: ['a', 'b', 'c', 'd'] });
    const { leftThenRight, rightThenLeft } = bothOrders(
      base,
      [
        { type: 'put', path: ['list', 1], value: 'B' },
        { type: 'put', path: ['list', 2], value: 'C' },
      ],
      [{ type: 'remove', path: ['list', 0], count: 3 }],
    );
    expect(leftThenRight).toEqual({ list: ['B', 'C', 'd'] });
    expect(rightThenLeft).toEqual(leftThenRight);
  });

  test('but not an edit inside the deleted value', () => {
    const base = Op.freeze({ map: { key: { title: 'old' } }, list: [{ title: 'one' }, { title: 'two' }] });
    const { leftThenRight, rightThenLeft } = bothOrders(
      base,
      [
        { type: 'put', path: ['map', 'key', 'title'], value: 'lost' },
        { type: 'splice', path: ['list', 0, 'title'], index: 3, remove: 0, insert: '!' },
      ],
      [
        { type: 'del', path: ['map', 'key'] },
        { type: 'remove', path: ['list', 0], count: 1 },
      ],
    );
    expect(leftThenRight).toEqual({ map: {}, list: [{ title: 'two' }] });
    expect(rightThenLeft).toEqual(leftThenRight);
  });
});
