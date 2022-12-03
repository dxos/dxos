//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { test as testWrapper } from './wrapper';

describe('wrapper', () => {
  before(() => {
    (globalThis as any).mochaExecutor = { environment: 'nodejs', tags: ['unit'] };
  });

  it('exposes tag method', () => {
    const test = testWrapper('test', () => {});
    expect(test.tag).to.not.be.undefined;
    expect(test.tag()).to.eq(test);
  });

  it('exposes enviroment methods', () => {
    const test = testWrapper('test', () => {});
    expect(test.onlyEnvironments).to.not.be.undefined;
    expect(test.skipEnvironments).to.not.be.undefined;
    expect(test.onlyEnvironments()).to.eq(test);
    expect(test.skipEnvironments()).to.eq(test);
  });
});
