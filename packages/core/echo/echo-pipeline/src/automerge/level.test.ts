//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import { Level } from 'level';

import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';

import { createTestLevel } from '../testing';

describe('Level', () => {
  test('missing keys', async () => {
    const level = await createTestLevel();

    expect(() => level.get('missing')).to.throw;
  });

  test('data persistance after reload', async () => {
    const path = `/tmp/dxos-${PublicKey.random().toHex()}`;
    const level = new Level<string, string>(path);
    await level.open();

    const key = 'name';
    const value = 'Rich';
    {
      await level.put(key, value);
      expect(await level.get(key)).to.equal(value);
    }

    await level.close();

    {
      const level = new Level<string, string>(path);
      await level.open();
      expect(await level.get(key)).to.equal(value);
      await level.clear();
      expect(() => level.get(key)).to.throw;
    }
  });
});
