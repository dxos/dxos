//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { generateKey, generateName, parseName } from './names';

const t = () => {
  const key = generateKey();
  const name = generateName(key);
  return { key, name };
};

it('example', function () {
  const examples = Array.from({ length: 5 }).map(() => {
    const { key, name } = t();
    const testKey = parseName(name);
    expect(key.buffer).to.deep.equal(testKey.buffer);
    return {
      key: key.toString('hex'),
      name
    };
  });

  console.log(JSON.stringify(examples, undefined, 2));
});

it('name to be unique', function () {
  Array.from({ length: 100 }).forEach(() => {
    const { key, name } = t();
    const testKey = parseName(name);
    expect(key.buffer).to.deep.equal(testKey.buffer);
  });
});
