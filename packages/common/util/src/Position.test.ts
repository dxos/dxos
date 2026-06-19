//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import * as Position from './Position';

type TestItem = {
  id: number;
  position?: Position.Position;
};

describe('Position.compare', () => {
  test('should keep items with same position in their original order', ({ expect }) => {
    const items: TestItem[] = [
      { id: 1 },
      { id: 2 },
      { id: 3, position: Position.first },
      { id: 4, position: Position.first },
      { id: 5, position: Position.last },
      { id: 6, position: Position.last },
    ];

    const sorted = [...items].sort(Position.compare);

    expect(sorted.findIndex((item) => item.id === 3)).toBeLessThan(sorted.findIndex((item) => item.id === 4));
    expect(sorted.findIndex((item) => item.id === 1)).toBeLessThan(sorted.findIndex((item) => item.id === 2));
    expect(sorted.findIndex((item) => item.id === 5)).toBeLessThan(sorted.findIndex((item) => item.id === 6));
  });

  test('should place Position.first items before items in natural order', ({ expect }) => {
    const items: TestItem[] = [{ id: 1 }, { id: 2, position: Position.first }];

    const sorted = [...items].sort(Position.compare);
    expect(sorted[0].position).toBe(Position.first);
    expect(sorted[1].position).toBeUndefined();
  });

  test('should place Position.last items after items in natural order', ({ expect }) => {
    const items: TestItem[] = [{ id: 1, position: Position.last }, { id: 2 }];

    const sorted = [...items].sort(Position.compare);
    expect(sorted[0].position).toBeUndefined();
    expect(sorted[1].position).toBe(Position.last);
  });

  test('should treat items without position as natural order', ({ expect }) => {
    const items: TestItem[] = [{ id: 1 }, { id: 2, position: Position.first }, { id: 3, position: Position.last }];

    const sorted = [...items].sort(Position.compare);
    expect(sorted[0].position).toBe(Position.first);
    expect(sorted[1].position).toBeUndefined();
    expect(sorted[2].position).toBe(Position.last);
  });

  test('should correctly sort mixed positions', ({ expect }) => {
    const items: TestItem[] = [
      { id: 1, position: Position.last },
      { id: 2 },
      { id: 3, position: Position.first },
      { id: 4 },
      { id: 5, position: Position.first },
      { id: 6, position: Position.last },
    ];

    const sorted = [...items].sort(Position.compare);

    expect(sorted[0].position).toBe(Position.first);
    expect(sorted[1].position).toBe(Position.first);

    expect(sorted[2].position).toBeUndefined();
    expect(sorted[3].position).toBeUndefined();

    expect(sorted[4].position).toBe(Position.last);
    expect(sorted[5].position).toBe(Position.last);
  });

  test('should sort numeric tiers between first and last', ({ expect }) => {
    const items: TestItem[] = [
      { id: 1, position: Position.last },
      { id: 2, position: 1 },
      { id: 3, position: Position.first },
      { id: 4 },
      { id: 5, position: -1 },
    ];

    const sorted = [...items].sort(Position.compare);

    expect(sorted[0].id).toBe(3); // Position.first = -Infinity
    expect(sorted[1].id).toBe(5); // -1
    expect(sorted[2].id).toBe(4); // undefined = 0
    expect(sorted[3].id).toBe(2); // 1
    expect(sorted[4].id).toBe(1); // Position.last = Infinity
  });

  test('should handle empty arrays', ({ expect }) => {
    const items: TestItem[] = [];
    expect(() => [...items].sort(Position.compare)).not.toThrow();
  });

  test('should handle single item arrays', ({ expect }) => {
    const items: TestItem[] = [{ id: 1 }];
    expect(() => [...items].sort(Position.compare)).not.toThrow();
  });
});
