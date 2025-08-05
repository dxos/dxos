//
// Copyright 2020 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { expectToThrow, raise } from '@dxos/debug';

import { until, waitForCondition } from './testing';
import { sleep } from './timeout';

describe('waitForCondition', () => {
  test('succeeds', async () => {
    const stop = Date.now() + 100;
    const value = await waitForCondition({ condition: () => Date.now() > stop, timeout: 200 });
    expect(value).to.be.true;
    expect(Date.now()).to.be.greaterThanOrEqual(stop);
  });

  test('fails', async () => {
    const stop = Date.now() + 200;
    await expectToThrow(() => waitForCondition({ condition: () => Date.now() > stop, timeout: 100 }));
  });

  test('breakOnError', async () => {
    await expect(() =>
      waitForCondition({ condition: () => raise(new Error('test')), timeout: 100, breakOnError: true }),
    ).rejects.toThrow('test');
  });
});

describe('until', () => {
  test('success', async () => {
    const value = await until<number>(async (resolve) => {
      await sleep(100);
      resolve(100);
      return 1;
    });

    expect(value).to.equal(100);
  });

  test('error', async () => {
    await expect(async () => {
      await until(async (resolve, reject) => {
        await sleep(100);
        reject(new Error());
      });
    }).rejects.toThrowError();
  });

  test('catch', async () => {
    await expect(async () => {
      await until(async () => {
        await sleep(100);
        throw new Error();
      });
    }).rejects.toThrowError();
  });

  test('timeout', async () => {
    await expect(async () => {
      await until(async (resolve) => {
        await sleep(500);
        resolve();
      }, 100); // Timeout before complete.
    }).rejects.toThrowError();
  });
});
