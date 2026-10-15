//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Event, sleep } from '@dxos/async';

import { timeoutUnlessProgress } from './locks.ts';

describe('timeoutUnlessProgress', () => {
  test('rejects once the timeout passes with no progress', async () => {
    const error = new Error('stalled');
    await expect(timeoutUnlessProgress(new Promise(() => {}), 50, new Event(), error)).rejects.toBe(error);
  });

  test('each progress event restarts the deadline', async () => {
    const progress = new Event();
    const work = (async () => {
      for (let i = 0; i < 4; i++) {
        await sleep(30);
        progress.emit();
      }
      return 'done';
    })();

    // 120 ms of work outlasts the 50 ms timeout, but no gap between reports does.
    await expect(timeoutUnlessProgress(work, 50, progress, new Error('stalled'))).resolves.toBe('done');
  });
});
