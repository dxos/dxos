//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { expectToThrow } from '@dxos/debug';

import { asyncTimeout, sleep } from './timeout';

describe('timeout', function () {
  it('succeeds', async function () {
    const promise = sleep(100).then(() => 'test');
    const value = await asyncTimeout(promise, 200, new Error('timeout'));
    expect(value).to.equal('test');
  });

  it('fails', async function () {
    const promise = sleep(100).then(() => 'test');
    await expectToThrow(() => asyncTimeout(promise, 100, new Error('timeout')));
  });

  it('sleep', async function () {
    const now = Date.now();
    await sleep(100);
    expect(Date.now()).to.be.greaterThanOrEqual(now + 100);
  });
});
