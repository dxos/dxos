//
// Copyright 2022 DXOS.org
//

import { generateKey, generateName, parseName } from './names';

const t = () => {
  const key = generateKey();
  const name = generateName(key);
  const testKey = parseName(name);
  expect(key).toEqual(testKey);
  return { key, name };
}

test('exampe', () => {
  const { key, name } = t();
  console.log(JSON.stringify({
    key: key.toString('hex'),
    name
  }));
});

test('name to be unique', () => {
  Array.from({ length: 100 }).forEach(t);
});
