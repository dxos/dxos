//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { captureSink } from './index';

describe('captureSink', () => {
  test('records every committed value in order', async ({ expect }) => {
    const { sink, items } = captureSink<number>();
    await EffectEx.runPromise(Effect.all([sink(1, {}), sink(2, {}), sink(3, {})]));
    expect(items).toEqual([1, 2, 3]);
  });
});
