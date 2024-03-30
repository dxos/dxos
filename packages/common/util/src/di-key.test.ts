import { describe, test } from 'vitest';
import { DiKey } from './di-key';

test('DiKey', ({ expect }) => {
  const A = DiKey.define('A');
  class B {}

  expect(DiKey.combine(A, B) === DiKey.combine(A, B)).toBeTruthy();
  expect(DiKey.stringify(DiKey.combine(A, B))).toEqual('A<B>');
});
