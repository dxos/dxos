//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { expectToThrow } from '@dxos/debug';
import { describe, test } from '@dxos/test';

import { sleep } from './timeout';
import { until } from './until';

describe('until', function () {
  test('success', async function () {
    const value = await until<number>(async (resolve) => {
      await sleep(100);
      resolve(100);
      return 1;
    });

    expect(value).to.equal(100);
  });

  test('error', async function () {
    await expectToThrow(async () => {
      await until(async (resolve, reject) => {
        await sleep(100);
        reject(new Error());
      });
    });
  });

  test('catch', async function () {
    await expectToThrow(async () => {
      await until(async () => {
        await sleep(100);
        throw new Error();
      });
    });
  });

  test('timeout', async function () {
    await expectToThrow(async () => {
      await until(async (resolve) => {
        await sleep(500);
        resolve();
      }, 100); // Timeout before complete.
    });
  });
});
