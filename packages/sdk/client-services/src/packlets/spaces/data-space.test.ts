//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Context, ContextDisposedError } from '@dxos/context';

import { loadRootDocWithRetry } from './data-space';

// Keep the backoff in the single-digit-millisecond range so the retry paths run in real time.
const RETRY_PARAMS = { retryDelayMin: 2, retryDelayMax: 4 };

describe('loadRootDocWithRetry', () => {
  test('retries transient failures until an attempt succeeds', async () => {
    const ctx = new Context();
    let calls = 0;
    const failures: unknown[] = [];

    const result = await loadRootDocWithRetry({
      ctx,
      attempt: async () => {
        calls++;
        if (calls < 3) {
          throw new Error('edge unavailable');
        }
        return 'handle';
      },
      isCurrent: () => true,
      onFailedAttempt: (_attempt, err) => failures.push(err),
      ...RETRY_PARAMS,
    });

    expect(result).toBe('handle');
    expect(calls).toBe(3);
    expect(failures).toHaveLength(2);
    expect(failures[0]).toBeInstanceOf(Error);
  });

  test('an empty resolution retries until the document appears', async () => {
    const ctx = new Context();
    let calls = 0;
    const failures: unknown[] = [];

    const result = await loadRootDocWithRetry({
      ctx,
      attempt: async () => (++calls < 3 ? null : 'handle'),
      isCurrent: () => true,
      onFailedAttempt: (_attempt, err) => failures.push(err),
      ...RETRY_PARAMS,
    });

    expect(result).toBe('handle');
    expect(calls).toBe(3);
    // Empty resolutions report no error.
    expect(failures).toEqual([undefined, undefined]);
  });

  test('stops with null once the root is superseded', async () => {
    const ctx = new Context();
    let calls = 0;

    const result = await loadRootDocWithRetry({
      ctx,
      attempt: async () => {
        calls++;
        throw new Error('edge unavailable');
      },
      // Current for the first attempt only; the retry must then stand down.
      isCurrent: () => calls === 0,
      onFailedAttempt: () => {},
      ...RETRY_PARAMS,
    });

    expect(result).toBeNull();
    expect(calls).toBe(1);
  });

  test('a disposed context aborts the loop', async () => {
    const ctx = new Context();
    let calls = 0;

    const promise = loadRootDocWithRetry({
      ctx,
      attempt: async () => {
        calls++;
        void ctx.dispose();
        throw new Error('edge unavailable');
      },
      isCurrent: () => true,
      onFailedAttempt: () => {},
      ...RETRY_PARAMS,
    });

    await expect(promise).rejects.toBeInstanceOf(ContextDisposedError);
    expect(calls).toBe(1);
  });
});
