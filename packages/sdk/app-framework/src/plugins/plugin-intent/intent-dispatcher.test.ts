//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { S } from '@dxos/echo-schema';

import { createIntent } from './intent';
import { createDispatcher, createResolver } from './intent-dispatcher';

class ToString extends S.TaggedClass<ToString>()('ToString', {
  input: S.Struct({
    value: S.Number,
  }),
  output: S.Struct({
    string: S.String,
  }),
}) {}

describe('intent', () => {
  test('test', async () => {
    const resolver = createResolver(ToString, async (data) => {
      return { data: { string: data.value.toString() } };
    });
    const { dispatchPromise } = createDispatcher([resolver]);
    const { data } = await dispatchPromise(createIntent(ToString, { value: 1 }));
    expect(data.string).toBe('1');
  });
});
