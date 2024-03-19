//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import { expect } from 'chai';

import { registerSignalRuntime } from './preact';
import { compositeRuntime } from './runtime';

registerSignalRuntime();

describe('Untracked', () => {
  it('Nested `untracked` does not cause effect to run', async () => {
    const signal = compositeRuntime.createSignal({});
    const value = new Proxy(
      { foo: 1 },
      {
        get: () => {
          signal.notifyRead();
        },
        set: () => {
          signal.notifyWrite();
          return true;
        },
      },
    );

    let updateCount = 0;

    effect(() => {
      value.foo;
      updateCount++;
    });

    compositeRuntime.untracked(() => {
      effect(() => {
        compositeRuntime.untracked(() => {
          value.foo;
          value.foo = 1;
        });
      });
    });

    expect(updateCount).to.eq(2);
  });
});
