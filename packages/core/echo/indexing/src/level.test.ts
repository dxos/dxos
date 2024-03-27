import { describe, test } from '@dxos/test';
import { createTestLevel } from './level';
import { expect } from 'chai';

describe('Level', () => {
  test('missing keys', async () => {
    const level = await createTestLevel();

    await expect(() => level.get('missing')).to.throw;
  });
});
