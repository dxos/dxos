//
// Copyright 2024 DXOS.org
//

import { expect, test } from 'vitest';

import { pick, pickBy } from './pick';

test('pick', () => {
  const object = { a: 1, b: '2', c: 3 };
  const result = pick(object, ['a', 'c']);
  expect(result).to.deep.equal({ a: 1, c: 3 });
});

test('pickBy', () => {
  const object = { a: 1, b: null, c: 3, d: false, e: undefined };
  const result = pickBy(object, (value) => Boolean(value));
  expect(result).to.deep.equal({ a: 1, c: 3 });
});
