//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';
import { describe, test } from 'vitest';

import { testServices } from '@dxos/functions/testing';

import { ValueBag } from './compute';

describe('ValueBag', () => {
  test('ValueBag.unwrap', async ({ expect }) => {
    const bag = ValueBag.make({ a: 1, b: 2 });
    const result = await Effect.runPromise(
      ValueBag.unwrap(bag).pipe(Effect.provide(testServices().createLayer()), Effect.scoped),
    );
    expect(result).toEqual({ a: 1, b: 2 });
  });
});
