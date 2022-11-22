//
// Copyright 2022 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { ApiError } from './errors';

chai.use(chaiAsPromised);

describe('Errors', function () {
  it('test', async function () {
    const test = async () => {
      throw new ApiError('Test error');
    };

    await expect(test()).to.be.rejectedWith('Test error');
  });
});
