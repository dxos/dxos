//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { expectToThrow } from '@dxos/debug';

import { sleep } from './async';
import { until } from './until';

describe('until', function () {
  it('success', async function () {
    const value = await until<number>(async (resolve) => {
      await sleep(100);
      resolve(100);
      return 1;
    });

    expect(value).to.equal(100);
  });

  it('error', async function () {
    await expectToThrow(async () => {
      await until(async (resolve, reject) => {
        await sleep(100);
        reject(new Error());
      });
    });
  });

  it('catch', async function () {
    await expectToThrow(async () => {
      await until(async () => {
        await sleep(100);
        throw new Error();
      });
    });
  });

  it('timeout', async function () {
    await expectToThrow(async () => {
      await until(async (resolve) => {
        await sleep(500);
        resolve();
      }, 100); // Timeout before complete.
    });
  });
});
