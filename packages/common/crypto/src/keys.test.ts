//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { createId } from './keys';

it('Create id is unique', function () {
  expect(createId()).not.to.equal(createId());
});
