//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { createArrayCallback } from './callback';

type Callback = {
  foo: (value: number) => void;
  bar?: () => void;
};

describe('callbacks', function () {
  it('calls array of callbacks', function () {
    const counters = {
      foo: 0,
      bar: 0
    };

    const handlers: Callback[] = [];
    const proxy: Callback = createArrayCallback<Callback>({ handlers });
    proxy.foo(10);
    proxy.bar?.();

    handlers.push({
      foo: (value: number) => {
        counters.foo += value;
      }
    });
    handlers.push({
      foo: (value: number) => {
        counters.foo += value * 2;
      },
      bar: () => {
        counters.bar++;
      }
    });
    proxy.foo(20);
    proxy.bar?.();

    handlers.length = 0;
    proxy.foo(30);

    expect(counters.foo).to.eq(60);
    expect(counters.bar).to.eq(1);
  });
});
