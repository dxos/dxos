//
// Copyright 2025 DXOS.org
//

import { describe, it, expect } from 'vitest';

import { byDisposition, type Disposition } from './disposition';

type TestItem = {
  id: number;
  disposition?: Disposition;
};

describe('byDisposition', () => {
  it('should keep items with same disposition in their original order', () => {
    const items: TestItem[] = [
      { id: 1, disposition: 'static' },
      { id: 2, disposition: 'static' },
      { id: 3, disposition: 'hoist' },
      { id: 4, disposition: 'hoist' },
      { id: 5, disposition: 'fallback' },
      { id: 6, disposition: 'fallback' },
    ];

    const sorted = [...items].sort(byDisposition);

    // Check that items with the same disposition maintain relative order
    expect(sorted.findIndex((item) => item.id === 3)).toBeLessThan(sorted.findIndex((item) => item.id === 4));
    expect(sorted.findIndex((item) => item.id === 1)).toBeLessThan(sorted.findIndex((item) => item.id === 2));
    expect(sorted.findIndex((item) => item.id === 5)).toBeLessThan(sorted.findIndex((item) => item.id === 6));
  });

  it('should place "hoist" items before "static" items', () => {
    const items: TestItem[] = [
      { id: 1, disposition: 'static' },
      { id: 2, disposition: 'hoist' },
    ];

    const sorted = [...items].sort(byDisposition);
    expect(sorted[0].disposition).toBe('hoist');
    expect(sorted[1].disposition).toBe('static');
  });

  it('should place "fallback" items after "static" items', () => {
    const items: TestItem[] = [
      { id: 1, disposition: 'fallback' },
      { id: 2, disposition: 'static' },
    ];

    const sorted = [...items].sort(byDisposition);
    expect(sorted[0].disposition).toBe('static');
    expect(sorted[1].disposition).toBe('fallback');
  });

  it('should treat items without disposition as "static"', () => {
    const items: TestItem[] = [{ id: 1 }, { id: 2, disposition: 'hoist' }, { id: 3, disposition: 'fallback' }];

    const sorted = [...items].sort(byDisposition);
    expect(sorted[0].disposition).toBe('hoist');
    expect(sorted[1].disposition).toBeUndefined();
    expect(sorted[2].disposition).toBe('fallback');
  });

  it('should correctly sort mixed dispositions', () => {
    const items: TestItem[] = [
      { id: 1, disposition: 'fallback' },
      { id: 2, disposition: 'static' },
      { id: 3, disposition: 'hoist' },
      { id: 4 }, // implicit static
      { id: 5, disposition: 'hoist' },
      { id: 6, disposition: 'fallback' },
    ];

    const sorted = [...items].sort(byDisposition);

    // All hoisted items should come first
    expect(sorted[0].disposition).toBe('hoist');
    expect(sorted[1].disposition).toBe('hoist');

    // Static items (including undefined) should be in the middle
    expect(sorted[2].disposition).toBe('static');
    expect(sorted[3].disposition).toBeUndefined();

    // Fallback items should be last
    expect(sorted[4].disposition).toBe('fallback');
    expect(sorted[5].disposition).toBe('fallback');
  });

  it('should handle empty arrays', () => {
    const items: TestItem[] = [];
    expect(() => [...items].sort(byDisposition)).not.toThrow();
  });

  it('should handle single item arrays', () => {
    const items: TestItem[] = [{ id: 1, disposition: 'static' }];
    expect(() => [...items].sort(byDisposition)).not.toThrow();
  });
});
