//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import { describe, test } from 'vitest';

import { createSetDispatch } from './callback';

type Callback = {
  foo: (value: number) => void;
  bar?: () => void;
};

describe('callbacks', () => {
  test('calls array of callbacks', () => {
    const counters = {
      foo: 0,
      bar: 0,
    };

    const handlers = new Set<Callback>();
    const proxy: Callback = createSetDispatch<Callback>({ handlers });
    proxy.foo(10);
    proxy.bar?.();

    handlers.add({
      foo: (value: number) => {
        counters.foo += value;
      },
    });
    handlers.add({
      foo: (value: number) => {
        counters.foo += value * 2;
      },
      bar: () => {
        counters.bar++;
      },
    });
    proxy.foo(20);
    proxy.bar?.();

    handlers.clear();
    proxy.foo(30);

    expect(counters.foo).to.eq(60);
    expect(counters.bar).to.eq(1);
  });
});
