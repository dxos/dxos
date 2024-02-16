//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';
import { test } from 'vitest';

import { PublicKey } from '@dxos/keys';

import { makeSet, makeMap } from './complex';

const PulicKeySet = makeSet<PublicKey>(PublicKey.hash);

test('ComplexSet', () => {
  const key1 = PublicKey.random();
  const key2 = PublicKey.random();
  const key3 = PublicKey.random();

  const set = new PulicKeySet([key1]);

  expect(set.has(key1)).to.be.true;
  expect(set.has(key2)).to.be.false;
  expect(Array.from(set.values())).to.deep.equal([key1]);

  set.add(key1);

  expect(Array.from(set.values())).to.deep.equal([key1]);

  set.add(key2);

  expect(set.has(key1)).to.be.true;
  expect(set.has(key2)).to.be.true;
  expect(set.has(key3)).to.be.false;
  expect(Array.from(set.values())).to.deep.equal([key1, key2]);

  set.delete(key1);

  expect(set.has(key1)).to.be.false;
  expect(set.has(key2)).to.be.true;
  expect(Array.from(set.values())).to.deep.equal([key2]);
});

const PulicKeyMap = makeMap<PublicKey>(PublicKey.hash);

test('ComplexMap', () => {
  const key1 = PublicKey.random();
  const key2 = PublicKey.random();
  const key3 = PublicKey.random();

  const map = new PulicKeyMap<string>([[key1, 'a']]);

  expect(map.has(key1)).to.be.true;
  expect(map.has(key2)).to.be.false;
  expect(map.get(key1)).to.equal('a');
  expect(Array.from(map.entries())).to.deep.equal([[key1, 'a']]);

  map.set(key1, 'b');

  expect(Array.from(map.entries())).to.deep.equal([[key1, 'b']]);
  expect(map.get(key1)).to.equal('b');

  map.set(key2, 'c');

  expect(map.has(key1)).to.be.true;
  expect(map.has(key2)).to.be.true;
  expect(map.has(key3)).to.be.false;
  expect(map.get(key1)).to.equal('b');
  expect(map.get(key2)).to.equal('c');
  expect(Array.from(map.entries())).to.deep.equal([
    [key1, 'b'],
    [key2, 'c'],
  ]);
  expect(Array.from(map.keys())).to.deep.equal([key1, key2]);
  expect(Array.from(map.values())).to.deep.equal(['b', 'c']);

  map.delete(key1);

  expect(map.has(key1)).to.be.false;
  expect(map.has(key2)).to.be.true;
  expect(Array.from(map.entries())).to.deep.equal([[key2, 'c']]);
});
