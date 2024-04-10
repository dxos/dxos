//
// Copyright 2024 DXOS.org
//

import { test } from 'vitest';

import { DiKey } from './di-key';

test('DiKey', ({ expect }) => {
  const A = DiKey.define('A');
  class B {}

  // eslint-disable-next-line no-self-compare
  expect(DiKey.combine(A, B) === DiKey.combine(A, B)).toBeTruthy();
  expect(DiKey.stringify(DiKey.combine(A, B))).toEqual('A<B>');
});
