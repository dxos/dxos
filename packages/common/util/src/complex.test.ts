//
// Copyright 2020 DXOS.org
//

import { PublicKey } from '@dxos/keys';

import { makeSet, makeMap } from '../src/complex';

const PulicKeySet = makeSet<PublicKey>(key => key.toHex());

test('ComplexSet', () => {
  const key1 = PublicKey.random();
  const key2 = PublicKey.random();
  const key3 = PublicKey.random();

  const set = new PulicKeySet([key1]);

  expect(set.has(key1)).toBe(true);
  expect(set.has(key2)).toBe(false);
  expect(Array.from(set.values())).toEqual([key1]);

  set.add(key1);

  expect(Array.from(set.values())).toEqual([key1]);

  set.add(key2);

  expect(set.has(key1)).toBe(true);
  expect(set.has(key2)).toBe(true);
  expect(set.has(key3)).toBe(false);
  expect(Array.from(set.values())).toEqual([key1, key2]);

  set.delete(key1);

  expect(set.has(key1)).toBe(false);
  expect(set.has(key2)).toBe(true);
  expect(Array.from(set.values())).toEqual([key2]);
});

const PulicKeyMap = makeMap<PublicKey>(key => key.toHex());

test('ComplexMap', () => {
  const key1 = PublicKey.random();
  const key2 = PublicKey.random();
  const key3 = PublicKey.random();

  const map = new PulicKeyMap<string>([[key1, 'a']]);

  expect(map.has(key1)).toBe(true);
  expect(map.has(key2)).toBe(false);
  expect(map.get(key1)).toEqual('a');
  expect(Array.from(map.entries())).toEqual([[key1, 'a']]);

  map.set(key1, 'b');

  expect(Array.from(map.entries())).toEqual([[key1, 'b']]);
  expect(map.get(key1)).toEqual('b');

  map.set(key2, 'c');

  expect(map.has(key1)).toBe(true);
  expect(map.has(key2)).toBe(true);
  expect(map.has(key3)).toBe(false);
  expect(map.get(key1)).toEqual('b');
  expect(map.get(key2)).toEqual('c');
  expect(Array.from(map.entries())).toEqual([[key1, 'b'], [key2, 'c']]);
  expect(Array.from(map.keys())).toEqual([key1, key2]);
  expect(Array.from(map.values())).toEqual(['b', 'c']);

  map.delete(key1);

  expect(map.has(key1)).toBe(false);
  expect(map.has(key2)).toBe(true);
  expect(Array.from(map.entries())).toEqual([[key2, 'c']]);
});
