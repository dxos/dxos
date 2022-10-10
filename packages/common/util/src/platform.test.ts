//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { isNode } from './platform.js';

it('knows when running in node', function () {
  if (mochaExecutor.environment === 'nodejs') {
    expect(isNode()).to.be.true;
  } else {
    expect(isNode()).to.be.false;
  }
});
