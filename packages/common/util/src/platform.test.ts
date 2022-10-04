//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { isNode } from './platform';

it('knows when running in node', function () {
  expect(isNode()).to.be.true;
});
