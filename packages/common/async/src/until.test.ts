//
// Copyright 2020 DXOS.org
//

import { sleep } from './async';
import { until } from './until';

describe('until', () => {
  test('success', async () => {
    const value = await until(async (resolve) => {
      await sleep(100);
      resolve(100);
    });

    expect(value).toBe(100);
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
