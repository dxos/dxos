//
// Copyright 2020 DXOS.org
//

import { expect, test } from 'vitest';

import { isNode } from './platform';

test('knows when running in node', () => {
  expect(isNode()).to.be.true;
});
