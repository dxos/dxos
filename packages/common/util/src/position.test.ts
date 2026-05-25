//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { type Position, byPosition } from './position';

type TestItem = {
  id: number;
  position?: Position;
};

describe('byPosition', () => {
  test('should keep items with same position in their original order', ({ expect }) => {
    const items: TestItem[] = [
      { id: 1 },
      { id: 2 },
      { id: 3, position: 'first' },
      { id: 4, position: 'first' },
      { id: 5, position: 'last' },
      { id: 6, position: 'last' },
    ];

    const sorted = [...items].sort(byPosition);

    // Check that items with the same position maintain relative order
    expect(sorted.findIndex((item) => item.id === 3)).toBeLessThan(sorted.findIndex((item) => item.id === 4));
    expect(sorted.findIndex((item) => item.id === 1)).toBeLessThan(sorted.findIndex((item) => item.id === 2));
    expect(sorted.findIndex((item) => item.id === 5)).toBeLessThan(sorted.findIndex((item) => item.id === 6));
  });

  test('should place "first" items before items in natural order', ({ expect }) => {
    const items: TestItem[] = [{ id: 1 }, { id: 2, position: 'first' }];

    const sorted = [...items].sort(byPosition);
    expect(sorted[0].position).toBe('first');
    expect(sorted[1].position).toBeUndefined();
  });

  test('should place "last" items after items in natural order', ({ expect }) => {
    const items: TestItem[] = [{ id: 1, position: 'last' }, { id: 2 }];

    const sorted = [...items].sort(byPosition);
    expect(sorted[0].position).toBeUndefined();
    expect(sorted[1].position).toBe('last');
  });

  test('should treat items without position as natural order', ({ expect }) => {
    const items: TestItem[] = [{ id: 1 }, { id: 2, position: 'first' }, { id: 3, position: 'last' }];

    const sorted = [...items].sort(byPosition);
    expect(sorted[0].position).toBe('first');
    expect(sorted[1].position).toBeUndefined();
    expect(sorted[2].position).toBe('last');
  });

  test('should correctly sort mixed positions', ({ expect }) => {
    const items: TestItem[] = [
      { id: 1, position: 'last' },
      { id: 2 },
      { id: 3, position: 'first' },
      { id: 4 },
      { id: 5, position: 'first' },
      { id: 6, position: 'last' },
    ];

    const sorted = [...items].sort(byPosition);

    // All "first" items should come first
    expect(sorted[0].position).toBe('first');
    expect(sorted[1].position).toBe('first');

    // Natural-order items (undefined) should be in the middle
    expect(sorted[2].position).toBeUndefined();
    expect(sorted[3].position).toBeUndefined();

    // "last" items should be at the end
    expect(sorted[4].position).toBe('last');
    expect(sorted[5].position).toBe('last');
  });

  test('should handle empty arrays', ({ expect }) => {
    const items: TestItem[] = [];
    expect(() => [...items].sort(byPosition)).not.toThrow();
  });

  test('should handle single item arrays', ({ expect }) => {
    const items: TestItem[] = [{ id: 1 }];
    expect(() => [...items].sort(byPosition)).not.toThrow();
  });
});
