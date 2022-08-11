//
// Copyright 2020 DXOS.org
//

import { isNode } from './platform';

test('knows when running in node', () => {
  expect(isNode()).toBe(true);
});
