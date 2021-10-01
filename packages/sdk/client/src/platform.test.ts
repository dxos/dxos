//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { isNode } from './platform';

test('knows when running in node', () => {
  expect(isNode()).toBe(true);
});
