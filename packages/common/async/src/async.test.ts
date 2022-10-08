//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { expectToThrow } from '@dxos/debug';

import { sleep, promiseTimeout, waitForCondition } from './async.js';
import { trigger } from './trigger.js';

const timeout = (f: Function, timeout = 0) => new Promise((resolve, reject) => {
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

it('sleep', async function () {
  const now = Date.now();

  await sleep(100);
  expect(Date.now()).to.be.greaterThanOrEqual(now + 100);
});

it('trigger', async function () {
  const [value, setValue] = trigger<any>();

  const t = setTimeout(() => setValue('test'), 10);

  const result = await value();
  expect(result).to.equal('test');

  clearTimeout(t);
});

it('promiseTimeout', async function () {
  {
    const promise = timeout(() => 'test', 100);
    const value = await promiseTimeout(promise, 200, new Error('timeout'));
    expect(value).to.equal('test');
  }

  {
    const promise = timeout(() => 'test', 200);
    await expectToThrow(() => promiseTimeout(promise, 100, new Error('timeout')));
  }
});

it('waitForCondition', async function () {
  {
    const stop = Date.now() + 100;
    const value = await waitForCondition(() => Date.now() > stop, 200);
    expect(value).to.be.true;
    expect(Date.now()).to.be.greaterThanOrEqual(stop);
  }

  {
    const stop = Date.now() + 200;
    await expectToThrow(() => waitForCondition(() => Date.now() > stop, 100));
  }
});
