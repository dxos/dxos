//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { createTestLevel } from '@dxos/echo-pipeline/testing';
import { describe, test } from '@dxos/test';

describe('Level', () => {
  test('missing keys', async () => {
    const level = await createTestLevel();

    await expect(() => level.get('missing')).to.throw;
  });
});
