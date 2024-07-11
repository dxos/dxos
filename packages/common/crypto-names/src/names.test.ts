//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { test } from '@dxos/test';

import { generateKey, generateName, parseName } from './names';

const t = () => {
  const key = generateKey();
  const name = generateName(key);
  return { key, name };
};

test('example', () => {
  const examples = Array.from({ length: 5 }).map(() => {
    const { key, name } = t();
    const testKey = parseName(name);
    expect(key.buffer).to.deep.equal(testKey.buffer);
    return {
      key: key.toString('hex'),
      name,
    };
  });

  // console.log(JSON.stringify(examples, undefined, 2));
  expect(examples).to.exist;
});

test('name to be unique', () => {
  Array.from({ length: 100 }).forEach(() => {
    const { key, name } = t();
    const testKey = parseName(name);
    expect(key.toString('hex')).to.equal(testKey.toString('hex'));
  });
});
