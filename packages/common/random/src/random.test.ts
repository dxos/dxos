//
// Copyright 2023 DXOS.org
//

import { describe, test } from 'vitest';

import { multiple } from './util';

describe('random', () => {
  test('multiple', ({ expect }) => {
    expect(multiple((i) => i, 5)).to.deep.eq([0, 1, 2, 3, 4]);
  });
});
