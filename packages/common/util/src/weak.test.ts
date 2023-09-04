//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { test, describe } from '@dxos/test';

import { WeakDictionary } from './weak';

describe.only('WeakDictionary', () => {
  test('unref item gets garbage collected', async () => {
    const map = new WeakDictionary<string, any>();
    const key = 'key';

    {
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
    }

    // Garbage collection should remove the item because no references exist.
    await waitForExpect(() => {
      expect(map.size).to.equal(0);
    }, 1000);

    expect(map.has(key)).to.equal(false);
  });
});
