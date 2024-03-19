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

    let updateCount = 0;

    compositeRuntime.untracked(() => {
      effect(() => {
        compositeRuntime.untracked(() => {
          signal.notifyRead();
          signal.notifyWrite();
          updateCount++;
        });
      });
    });

    expect(updateCount).to.eq(1);
  });
});
