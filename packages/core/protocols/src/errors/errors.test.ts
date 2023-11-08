//
// Copyright 2022 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { describe, test } from '@dxos/test';

import { ApiError } from './base-errors';

chai.use(chaiAsPromised);

describe('Errors', () => {
  test('test', async () => {
    const runTest = async () => {
      throw new ApiError('Test error');
    };

    await expect(runTest()).to.be.rejectedWith('Test error');
  });
});
