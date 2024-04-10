//
// Copyright 2024 DXOS.org
//

import { test } from 'vitest';

import { DiContainer } from './di-container';
import { DiKey } from './di-key';

test('DiContainer', ({ expect }) => {
  const A = DiKey.define<string>('A');
  class B {}

  const generic = DiKey.define('Generic');
  type Generic<T> = { foo: T };
  const Generic = <T>(param: DiKey<T>): DiKey<Generic<T>> => DiKey.combine(generic, param);

  const Singleton = DiKey.singleton('Singleton', () => 'singleton');

  const b = new B();
  const container = new DiContainer()
    .provide(B, b)
    .provide(Generic(A), {
      foo: 'Generic A',
    })
    .provide(Generic(B), { foo: b });

  expect(container.get(B)).toBe(b);
  expect(container.get(Generic(A)).foo).toBe('Generic A');
  expect(container.get(Generic(B)).foo).toBe(b);
  expect(container.get(Singleton)).toBe('singleton');
});
