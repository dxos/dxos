//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { test } from '@dxos/test';

import { createId } from './keys';

test('Create id is unique', function () {
  expect(createId()).not.to.equal(createId());
});
