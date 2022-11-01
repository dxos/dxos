//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { expectToThrow } from '@dxos/debug';

import { asyncTimeout, sleep } from './timeout';

const timeout = (f: Function, timeout = 0) =>
  new Promise((resolve, reject) => {
    const handle = setTimeout(async () => {
      try {
        const value = await f();
        resolve(value);
      } catch (err) {
        reject(err);
      } finally {
        clearTimeout(handle);
      }
    }, timeout);
  });

describe('timeout', function () {
  it('succeeds', async function () {
    const promise = timeout(() => 'test', 100);
    const value = await asyncTimeout(promise, 200, new Error('timeout'));
    expect(value).to.equal('test');
  });

  it('fails', async function () {
    const promise = timeout(() => 'test', 200);
    await expectToThrow(() => asyncTimeout(promise, 100, new Error('timeout')));
  });

  it('sleep', async function () {
    const now = Date.now();
    await sleep(100);
    expect(Date.now()).to.be.greaterThanOrEqual(now + 100);
  });
});
