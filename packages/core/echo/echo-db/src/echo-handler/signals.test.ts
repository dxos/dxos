//
// Copyright 2024 DXOS.org
//

import { test } from 'vitest';

import { updateCounter } from '@dxos/echo/testing';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { compositeRuntime } from '@dxos/echo-signals/runtime';

registerSignalsRuntime();

// Sanity test for signals.
test('signals', ({ expect }) => {
  const signal = compositeRuntime.createSignal();
  using updates = updateCounter(() => {
    signal.notifyRead();
  });
  expect(updates.count).toEqual(0);

  signal.notifyWrite();
  expect(updates.count).toEqual(1);
});
