//
// Copyright 2020 DXOS.org
//

// dxos-testing-browser

import { sleep, promiseTimeout, timeout, waitForCondition } from '../src/async';
import { trigger } from '../src/trigger';
import { expectToThrow } from './testing';

test('sleep', async () => {
  const now = Date.now();

  await sleep(100);
  expect(Date.now()).toBeGreaterThanOrEqual(now + 100);
});

test('trigger', async () => {
  const [value, setValue] = trigger();

  const t = setTimeout(() => setValue('test'), 10);

  const result = await value();
  expect(result).toBe('test');

  clearTimeout(t);
});

test('promiseTimeout', async () => {
  {
    const promise = timeout(() => 'test', 100);
    const value = await promiseTimeout(promise, 200);
    expect(value).toBe('test');
  }

  {
    const promise = timeout(() => 'test', 200);
    await expectToThrow(() => promiseTimeout(promise, 100));
  }
});

test('waitForCondition', async () => {
  {
    const stop = Date.now() + 100;
    const value = await waitForCondition(() => Date.now() > stop, 200);
    expect(value).toBe(true);
    expect(Date.now()).toBeGreaterThanOrEqual(stop);
  }

  {
    const stop = Date.now() + 200;
    await expectToThrow(() => waitForCondition(() => Date.now() > stop, 100));
  }
});
