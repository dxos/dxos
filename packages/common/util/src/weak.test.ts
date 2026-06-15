//
// Copyright 2023 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { WeakDictionary } from './weak';

describe('WeakDictionary', () => {
  // Skipped because it takes a long time for garbage collection to kick in (~8 sec)
  // but it works otherwise.
  test.skip('unref item gets garbage collected', { timeout: 20_000 }, async () => {
    const map = new WeakDictionary<string, any>();
    const key = 'key';

    const setValue = () => {
      const value = { test: 'test' };
      map.set(key, value);
      expect(map.get(key)).to.equal(value);
      expect(map.size).to.equal(1);
      expect(map.has(key)).to.equal(true);
      expect([...map.keys()]).to.deep.equal([key]);
      expect([...map.values()]).to.deep.equal([value]);

      for (const [k, v] of map) {
        expect(k).to.equal(key);
        expect(v).to.equal(value);
      }
    };

    setValue();
    // Garbage collection should remove the item because no references exist.
    await expect.poll(() => map.size, { timeout: 20_000 }).toEqual(0);

    expect(map.has(key)).to.equal(false);
  });
});
