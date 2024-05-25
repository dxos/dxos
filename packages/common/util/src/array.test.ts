//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import { describe, test } from 'vitest';

import { diff, intersection, distinctBy } from './array';

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

describe('distinctBy', () => {
  test('filters distinct elements by a given key', () => {
    {
      const array = [1, 2, 2, 3, 4, 4, 5];
      const distinct = distinctBy(array, (a) => a);
      expect(distinct).to.deep.eq([1, 2, 3, 4, 5]);
    }
    {
      const array = [{ x: 1 }, { x: 2 }, { x: 2 }, { x: 3 }, { x: 4 }, { x: 4 }, { x: 5 }];
      const distinct = distinctBy(array, (a) => a.x);
      expect(distinct).to.deep.eq([{ x: 1 }, { x: 2 }, { x: 3 }, { x: 4 }, { x: 5 }]);
    }
    {
      const array = ['apple', 'banana', 'apple', 'orange', 'banana'];
      const distinct = distinctBy(array, (a) => a);
      expect(distinct).to.deep.eq(['apple', 'banana', 'orange']);
    }
  });

  test('handles empty arrays', () => {
    {
      const array: number[] = [];
      const distinct = distinctBy(array, (a) => a);
      expect(distinct).to.deep.eq([]);
    }
    {
      const array: { x: number }[] = [];
      const distinct = distinctBy(array, (a) => a.x);
      expect(distinct).to.deep.eq([]);
    }
  });

  test('works with complex objects', () => {
    {
      const array = [{ x: { y: 1 } }, { x: { y: 2 } }, { x: { y: 1 } }];
      const distinct = distinctBy(array, (a) => a.x.y);
      expect(distinct).to.deep.eq([{ x: { y: 1 } }, { x: { y: 2 } }]);
    }
  });

  test('case sensitivity', () => {
    {
      const array = ['apple', 'Apple', 'APPLE'];
      const distinct = distinctBy(array, (a) => a.toLowerCase());
      expect(distinct).to.deep.eq(['apple']);
    }
  });

  test('null and undefined values', () => {
    {
      const array = [1, 2, null, 2, null, undefined, 3];
      const distinct = distinctBy(array, (a) => a);
      expect(distinct).to.deep.eq([1, 2, null, undefined, 3]);
    }
  });
});
