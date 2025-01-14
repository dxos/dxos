//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';
import { describe, test } from 'vitest';

import { makeValueBag, unwrapValueBag } from './compute';
import { testServices } from '../testing';

describe('ValueBag', () => {
  test('unwrapValueBag', async ({ expect }) => {
    const bag = makeValueBag({ a: 1, b: 2 });
    const result = await Effect.runPromise(unwrapValueBag(bag).pipe(Effect.provide(testServices()), Effect.scoped));
    expect(result).toEqual({ a: 1, b: 2 });
  });
});
