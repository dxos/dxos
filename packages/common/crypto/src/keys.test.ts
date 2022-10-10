//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { createId } from './keys.js';

it('Create id is unique', function () {
  expect(createId()).not.to.equal(createId());
});
