//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { type BaseObject } from './types';

describe('Types', () => {
  test('checks sanity', async ({ expect }) => {
    const obj: BaseObject = {};
    expect(obj).to.exist;
  });
});
