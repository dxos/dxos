//
// Copyright 2024 DXOS.org
//

import { test } from 'vitest';

import { updateCounter } from '@dxos/echo-schema/testing';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { compositeRuntime } from '@dxos/echo-signals/runtime';

registerSignalsRuntime();

test('signals', ({ expect }) => {
  const sig = compositeRuntime.createSignal();

  using updates = updateCounter(() => {
    sig.notifyRead();
  });
  expect(updates.count).toEqual(0);

  sig.notifyWrite();

  expect(updates.count).toEqual(1);
});
