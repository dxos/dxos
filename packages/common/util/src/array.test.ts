//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { diff, distinctBy, intersection, partition } from './array';

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

describe('partition', () => {
  test('should handle empty arrays', () => {
    const input: number[] = [];
    const isPositive = (n: number): n is number => n > 0;

    const [positive, negative] = partition(input, isPositive);

    expect(positive).toEqual([]);
    expect(negative).toEqual([]);
  });

  test('should partition numbers by sign', () => {
    const input = [-2, -1, 0, 1, 2];
    const isPositive = (n: number): n is number => n > 0;

    const [positive, negative] = partition(input, isPositive);

    expect(positive).toEqual([1, 2]);
    expect(negative).toEqual([-2, -1, 0]);
  });

  test('should maintain the original order within partitions', () => {
    const input = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3];
    const isEven = (n: number): n is number => n % 2 === 0;

    const [evens, odds] = partition(input, isEven);

    expect(evens).toEqual([4, 2, 6]);
    expect(odds).toEqual([3, 1, 1, 5, 9, 5, 3]);
  });

  test('should handle nullable types', () => {
    const input = ['hello', null, 'world', undefined, ''];
    const isNonNullable = <T>(value: T | null | undefined): value is T => value != null;

    const [nonNull, nullable] = partition(input, isNonNullable);

    expect(nonNull).toEqual(['hello', 'world', '']);
    expect(nullable).toEqual([null, undefined]);
  });

  test('should work with complex type guards', () => {
    interface Success<T> {
      status: 'success';
      data: T;
    }
    interface Error {
      status: 'error';
      message: string;
    }
    type Result<T> = Success<T> | Error;

    const results: Result<number>[] = [
      { status: 'success', data: 42 },
      { status: 'error', message: 'Invalid' },
      { status: 'success', data: 123 },
    ];

    const isSuccess = <T>(result: Result<T>): result is Success<T> => result.status === 'success';

    const [successes, errors] = partition(results, isSuccess);

    expect(successes).toHaveLength(2);
    expect(errors).toHaveLength(1);
    expect(successes.every((s) => s.status === 'success')).toBe(true);
    expect(errors.every((e) => e.status === 'error')).toBe(true);
  });

  test('should handle instance checks', () => {
    const input = [new Date(), 'string', new Date(), 42];
    const isDate = (value: unknown): value is Date => value instanceof Date;

    const [dates, nonDates] = partition(input, isDate);

    expect(dates).toHaveLength(2);
    expect(nonDates).toHaveLength(2);
    expect(dates.every((d) => d instanceof Date)).toBe(true);
    expect(nonDates).toContain('string');
    expect(nonDates).toContain(42);
  });
});
