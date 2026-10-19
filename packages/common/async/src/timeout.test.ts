//
// Copyright 2020 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Event } from './events.ts';
import { asyncTimeout, sleep, timeoutUnlessProgress } from './timeout.ts';

describe('timeout', () => {
  test('succeeds', async () => {
    const promise = sleep(100).then(() => 'test');
    const value = await asyncTimeout(promise, 200, new Error('timeout'));
    expect(value).to.equal('test');
  });

  test('fails', async () => {
    const promise = sleep(200).then(() => 'test');
    await expect(() => asyncTimeout(promise, 100, new Error('timeout'))).rejects.toThrowError();
  });

  test('sleep', async () => {
    const now = Date.now();
    await sleep(100);
    expect(Date.now()).to.be.greaterThanOrEqual(now + 100);
  });
});

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

    await expect(timeoutUnlessProgress(work, 50, progress, new Error('stalled'))).resolves.toBe('done');
  });
});
