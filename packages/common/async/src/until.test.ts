//
// Copyright 2020 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { sleep } from './timeout';
import { until } from './until';

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
