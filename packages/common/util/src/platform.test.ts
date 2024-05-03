//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';
import { test } from 'vitest';

import { isNode } from './platform';

// TODO(dmaretskyi): Broken with vitest conversion.
test.skip('knows when running in node', () => {
  if (mochaExecutor.environment === 'nodejs') {
    expect(isNode()).to.be.true;
  } else {
    expect(isNode()).to.be.false;
  }
});
