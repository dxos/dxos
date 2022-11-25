//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { test } from '@dxos/test';

import { isNode } from './platform';

test('knows when running in node', function () {
  if (mochaExecutor.environment === 'nodejs') {
    expect(isNode()).to.be.true;
  } else {
    expect(isNode()).to.be.false;
  }
});
