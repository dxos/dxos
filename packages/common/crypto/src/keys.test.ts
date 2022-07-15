//
// Copyright 2020 DXOS.org
//

// DXOS testing browser.

import { createId } from './keys';

test('Create id is unique', () => {
  expect(createId()).not.toEqual(createId());
});
