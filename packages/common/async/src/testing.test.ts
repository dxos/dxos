//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { expectToThrow } from '@dxos/debug';

import { waitForCondition } from './testing';

describe('waitForCondition2', function () {
  it('succeeds', async function () {
    const stop = Date.now() + 100;
    const value = await waitForCondition(() => Date.now() > stop, 200);
    expect(value).to.be.true;
    expect(Date.now()).to.be.greaterThanOrEqual(stop);
  });

  it('fails', async function () {
    const stop = Date.now() + 200;
    await expectToThrow(() => waitForCondition(() => Date.now() > stop, 100));
  });
});
