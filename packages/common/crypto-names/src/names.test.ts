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

test('example', () => {
  const examples = Array.from({ length: 5 }).map(() => {
    const { key, name } = t();
    return {
      key: key.toString('hex'),
      name
    };
  });

  console.log(JSON.stringify(examples, undefined, 2));
});

test('name to be unique', () => {
  Array.from({ length: 100 }).forEach(t);
});
