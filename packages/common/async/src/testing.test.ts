//
// Copyright 2020 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { expectToThrow, raise } from '@dxos/debug';

import { waitForCondition } from './testing';

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
