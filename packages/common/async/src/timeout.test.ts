//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { expectToThrow } from '@dxos/debug';
import { describe, test } from '@dxos/test';

import { asyncTimeout, sleep } from './timeout';

describe('timeout', () => {
  test('succeeds', async () => {
    const promise = sleep(100).then(() => 'test');
    const value = await asyncTimeout(promise, 200, new Error('timeout'));
    expect(value).to.equal('test');
  });

  test('fails', async () => {
    const promise = sleep(200).then(() => 'test');
    await expectToThrow(() => asyncTimeout(promise, 100, new Error('timeout')));
  });

  test('sleep', async () => {
    const now = Date.now();
    await sleep(100);
    expect(Date.now()).to.be.greaterThanOrEqual(now + 100);
  });
});
