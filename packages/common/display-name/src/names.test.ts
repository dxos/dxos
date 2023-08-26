//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { PublicKey } from '@dxos/keys';
import { test } from '@dxos/test';

import { generateName } from './names';

test('example', () => {
  const examples = Array.from({ length: 5 }).map(() => {
    const key = PublicKey.random();
    const name = generateName(key.toHex());
    return {
      key: key.toHex(),
      name,
    };
  });

  // console.log(JSON.stringify(examples, undefined, 2));
  expect(examples).to.exist;
});

test('deterministic', () => {
  [
    {
      key: '0ac5ecb9b35b132e179dd115df316ae7d94d887f01bd726323b5ca580f49c1b9',
      name: 'Economical Crane',
    },
    {
      key: '854d411fe058bd79b61e3be3c7ac28b795c7d8c7d28b1e82e4bb5f9347854d7d',
      name: 'Cool Reindeer',
    },
    {
      key: '80290e89ae9ab4bd0342c4522f5174d68fb4a803b433c26f21ed86fc141f138b',
      name: 'Hardy Pug',
    },
    {
      key: '279995fb186677b8767e1febc4c2118174c1c985f373c9d33e1671d34481e9ee',
      name: 'Gentlest Piranha',
    },
    {
      key: '9acb3e2ce4fe3883a0d823308836125de6fb7522d74fedc86b735aff70c80829',
      name: 'Passionate Lemming',
    },
  ].forEach(({ key, name }) => {
    expect(generateName(key)).to.equal(name);
  });
});

// TODO(wittjosiah): Not unique enough for this test to not be flaky.
test.skip('name to be unique', () => {
  const keys = Array.from({ length: 100 }).map(() => PublicKey.random());
  const names = keys.map((key) => generateName(key.toHex()));
  const unique = new Set(names);
  expect(unique.size).to.equal(names.length);
});
