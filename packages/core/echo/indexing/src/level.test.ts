//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { createTestLevel } from './testing';

describe('Level', () => {
  test('missing keys', async () => {
    const level = await createTestLevel();

    await expect(() => level.get('missing')).to.throw;
  });
});
