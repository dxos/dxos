//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { diff, intersection } from './util';

describe('diff', () => {
  test('returns the difference between two sets', () => {
    {
      const { added, updated, removed } = diff<number>([], [], (a, b) => a === b);
      expect(added).to.deep.eq([]);
      expect(updated).to.deep.eq([]);
      expect(removed).to.deep.eq([]);
    }
    {
      const previous = [1, 2, 3];
      const next = [2, 3, 4];
      const { added, updated, removed } = diff(previous, next, (a, b) => a === b);
      expect(added).to.deep.eq([4]);
      expect(updated).to.deep.eq([2, 3]);
      expect(removed).to.deep.eq([1]);
    }
    {
      const previous = [{ x: 1 }, { x: 2 }, { x: 3 }];
      const next = [{ x: 2 }, { x: 3 }, { x: 4 }];
      const { added, updated, removed } = diff(previous, next, (a, b) => a.x === b.x);
      expect(added).to.deep.eq([{ x: 4 }]);
      expect(updated).to.deep.eq([{ x: 2 }, { x: 3 }]);
      expect(removed).to.deep.eq([{ x: 1 }]);
    }
  });

  test('intersection', () => {
    expect(intersection([1, 2, 3], [2, 3, 4], (a, b) => a === b)).to.deep.eq([2, 3]);
    expect(
      intersection([{ x: 1 }, { x: 2 }, { x: 3 }], [{ x: 2 }, { x: 3 }, { x: 4 }], (a, b) => a.x === b.x),
    ).to.deep.eq([{ x: 2 }, { x: 3 }]);
  });
});
