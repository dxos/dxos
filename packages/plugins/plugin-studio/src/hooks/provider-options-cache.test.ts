//
// Copyright 2026 DXOS.org
//

import * as Redacted from 'effect/Redacted';
import { beforeEach, describe, test } from 'vitest';

import { invalidateProviderOptions, loadProviderOptions } from './provider-options-cache.ts';

describe('provider options cache', () => {
  beforeEach(() => invalidateProviderOptions());

  const makeProvider = (calls: { count: number }, fail = false) => ({
    id: 'test',
    fieldOptions: {
      model: async () => {
        calls.count += 1;
        if (fail) {
          throw new Error('boom');
        }
        return [{ value: 'a', label: 'A' }];
      },
    },
  });

  test('shares one load per provider/field/credential', async ({ expect }) => {
    const calls = { count: 0 };
    const provider = makeProvider(calls);
    const key = Redacted.make('secret');
    const [first, second] = await Promise.all([
      loadProviderOptions(provider, 'model', { apiKey: key }),
      loadProviderOptions(provider, 'model', { apiKey: key }),
    ]);
    expect(first).toEqual([{ value: 'a', label: 'A' }]);
    expect(second).toBe(first);
    expect(calls.count).toBe(1);

    // A different credential is a different list.
    await loadProviderOptions(provider, 'model', { apiKey: Redacted.make('other') });
    expect(calls.count).toBe(2);
  });

  test('a failed load is not cached', async ({ expect }) => {
    const calls = { count: 0 };
    const provider = makeProvider(calls, true);
    await expect(loadProviderOptions(provider, 'model', {})).rejects.toThrow('boom');
    await expect(loadProviderOptions(provider, 'model', {})).rejects.toThrow('boom');
    expect(calls.count).toBe(2);
  });

  test('a field without a loader yields nothing, and invalidation drops a provider', async ({ expect }) => {
    const calls = { count: 0 };
    const provider = makeProvider(calls);
    expect(await loadProviderOptions(provider, 'prompt', {})).toEqual([]);
    await loadProviderOptions(provider, 'model', {});
    invalidateProviderOptions('test');
    await loadProviderOptions(provider, 'model', {});
    expect(calls.count).toBe(2);
  });
});
