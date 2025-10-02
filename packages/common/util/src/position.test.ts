//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from 'vitest';

import { type Position, byPosition } from './position';

type TestItem = {
  id: number;
  position?: Position;
};

describe('byPosition', () => {
  it('should keep items with same position in their original order', () => {
    const items: TestItem[] = [
      { id: 1, position: 'static' },
      { id: 2, position: 'static' },
      { id: 3, position: 'hoist' },
      { id: 4, position: 'hoist' },
      { id: 5, position: 'fallback' },
      { id: 6, position: 'fallback' },
    ];

    const sorted = [...items].sort(byPosition);

    // Check that items with the same position maintain relative order
    expect(sorted.findIndex((item) => item.id === 3)).toBeLessThan(sorted.findIndex((item) => item.id === 4));
    expect(sorted.findIndex((item) => item.id === 1)).toBeLessThan(sorted.findIndex((item) => item.id === 2));
    expect(sorted.findIndex((item) => item.id === 5)).toBeLessThan(sorted.findIndex((item) => item.id === 6));
  });

  it('should place "hoist" items before "static" items', () => {
    const items: TestItem[] = [
      { id: 1, position: 'static' },
      { id: 2, position: 'hoist' },
    ];

    const sorted = [...items].sort(byPosition);
    expect(sorted[0].position).toBe('hoist');
    expect(sorted[1].position).toBe('static');
  });

  it('should place "fallback" items after "static" items', () => {
    const items: TestItem[] = [
      { id: 1, position: 'fallback' },
      { id: 2, position: 'static' },
    ];

    const sorted = [...items].sort(byPosition);
    expect(sorted[0].position).toBe('static');
    expect(sorted[1].position).toBe('fallback');
  });

  it('should treat items without position as "static"', () => {
    const items: TestItem[] = [{ id: 1 }, { id: 2, position: 'hoist' }, { id: 3, position: 'fallback' }];

    const sorted = [...items].sort(byPosition);
    expect(sorted[0].position).toBe('hoist');
    expect(sorted[1].position).toBeUndefined();
    expect(sorted[2].position).toBe('fallback');
  });

  it('should correctly sort mixed positions', () => {
    const items: TestItem[] = [
      { id: 1, position: 'fallback' },
      { id: 2, position: 'static' },
      { id: 3, position: 'hoist' },
      { id: 4 }, // implicit static
      { id: 5, position: 'hoist' },
      { id: 6, position: 'fallback' },
    ];

    const sorted = [...items].sort(byPosition);

    // All hoisted items should come first
    expect(sorted[0].position).toBe('hoist');
    expect(sorted[1].position).toBe('hoist');

    // Static items (including undefined) should be in the middle
    expect(sorted[2].position).toBe('static');
    expect(sorted[3].position).toBeUndefined();

    // Fallback items should be last
    expect(sorted[4].position).toBe('fallback');
    expect(sorted[5].position).toBe('fallback');
  });

  it('should handle empty arrays', () => {
    const items: TestItem[] = [];
    expect(() => [...items].sort(byPosition)).not.toThrow();
  });

  it('should handle single item arrays', () => {
    const items: TestItem[] = [{ id: 1, position: 'static' }];
    expect(() => [...items].sort(byPosition)).not.toThrow();
  });
});
