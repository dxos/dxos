//
// Copyright 2024 DXOS.org
//

import { effect, signal, untracked } from '@preact/signals-core';
import { describe, expect, test } from 'vitest';

describe('Untracked', () => {
  test('Nested `untracked` does not cause effect to run', async () => {
    const thisSignal = signal({});
    let updateCount = 0;

    untracked(() => {
      effect(() => {
        untracked(() => {
          const _ = thisSignal.value;
          thisSignal.value = {};
          updateCount++;
        });
      });
    });

    expect(updateCount).to.eq(1);
  });
});
