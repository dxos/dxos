//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { test as testWrapper } from './wrapper';

describe('wrapper', function () {
  before(function () {
    (globalThis as any).mochaExecutor = { environment: 'nodejs', tags: ['unit'] };
  });

  it('exposes tag method', function () {
    const test = testWrapper('test', () => {});
    expect(test.tag).to.not.be.undefined;
    expect(test.tag()).to.eq(test);
  });

  it('exposes enviroment method', function () {
    const test = testWrapper('test', () => {});
    expect(test.environment).to.not.be.undefined;
    expect(test.environment()).to.eq(test);
  });
});
