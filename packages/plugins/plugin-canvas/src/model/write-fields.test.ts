//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { writeFields } from './write-fields.ts';

/** A target that records the path of every assignment and deletion made to it, at any depth. */
const recording = (value: Record<string, unknown>) => {
  const writes: string[] = [];
  const wrap = (target: Record<string, unknown>, path: string[]): Record<string, unknown> =>
    new Proxy(target, {
      get: (object, key) => {
        const inner = Reflect.get(object, key);
        return typeof key === 'string' && typeof inner === 'object' && inner !== null && !Array.isArray(inner)
          ? wrap(inner, [...path, key])
          : inner;
      },
      set: (object, key, next) => {
        writes.push(['set', ...path, String(key)].join(' '));
        return Reflect.set(object, key, next);
      },
      deleteProperty: (object, key) => {
        writes.push(['delete', ...path, String(key)].join(' '));
        return Reflect.deleteProperty(object, key);
      },
    });
  return { target: wrap(value, []), writes };
};

describe('writeFields', () => {
  test('writes only the leaves that changed, so a peer’s edit to another field merges', () => {
    const before = { id: 'a', label: 'A', center: { x: 0, y: 0, z: 0 }, members: ['b'] };
    const after = { id: 'a', label: 'A', center: { x: 1, y: 0, z: 0 }, members: ['b', 'c'], hidden: true };
    const { target, writes } = recording(JSON.parse(JSON.stringify(before)));
    writeFields(target, before, after);
    expect(writes.sort()).toEqual(['set center x', 'set hidden', 'set members']);
    expect(target).toEqual(after);
  });

  test('a field left out of the next value is deleted, and a new nested record is set whole', () => {
    const before = { id: 'a', style: { hue: 'red' } };
    const after = { id: 'a', scale: { x: 2, y: 2, z: 2 } };
    const { target, writes } = recording(JSON.parse(JSON.stringify(before)));
    writeFields(target, before, after);
    expect(writes.sort()).toEqual(['delete style', 'set scale']);
    expect(target).toEqual(after);
  });
});
