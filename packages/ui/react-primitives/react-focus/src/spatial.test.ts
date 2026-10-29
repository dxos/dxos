//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type SpatialCandidate, type SpatialRect, findNearest } from './spatial.ts';

const rect = (left: number, top: number, width: number, height: number): SpatialRect => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
});

const layout = (cells: Record<string, SpatialRect>): SpatialCandidate<string>[] =>
  Object.entries(cells).map(([value, cell]) => ({ rect: cell, value }));

describe('findNearest', () => {
  // A kanban: three columns 120 wide, cards of different heights, the middle column short.
  const kanban = {
    a1: rect(0, 0, 100, 60),
    a2: rect(0, 70, 100, 120),
    a3: rect(0, 200, 100, 60),
    b1: rect(120, 0, 100, 60),
    c1: rect(240, 0, 100, 40),
    c2: rect(240, 50, 100, 40),
    c3: rect(240, 100, 100, 40),
    c4: rect(240, 210, 100, 40),
  };
  const candidates = (from: string) => layout(kanban).filter(({ value }) => value !== from);
  const move = (from: keyof typeof kanban, direction: Parameters<typeof findNearest>[2]) =>
    findNearest(kanban[from], candidates(from), direction);

  test('left and right go to the card level with it in the next column', ({ expect }) => {
    expect(move('a1', 'right')).toBe('b1');
    // Below every card in the short middle column: its nearest card, not the column beyond.
    expect(move('a3', 'right')).toBe('b1');
    expect(move('b1', 'right')).toBe('c1');
    expect(move('c4', 'left')).toBe('b1');
    expect(move('c3', 'left')).toBe('b1');
    expect(move('a2', 'left')).toBeUndefined();
  });

  test('up and down walk a column in order', ({ expect }) => {
    expect(move('c1', 'down')).toBe('c2');
    expect(move('c3', 'down')).toBe('c4');
    expect(move('c4', 'up')).toBe('c3');
    expect(move('a1', 'up')).toBeUndefined();
    expect(move('b1', 'down')).toBeUndefined();
  });

  test('a masonry column is walked in order though a neighbour starts nearer', ({ expect }) => {
    const masonry = {
      left1: rect(0, 0, 100, 100),
      left2: rect(0, 110, 100, 100),
      right1: rect(110, 0, 100, 40),
      right2: rect(110, 104, 100, 200),
    };
    const from = 'left1';
    const others = layout(masonry).filter(({ value }) => value !== from);
    // `right2` starts at 104, nearer than `left2` at 110, but only `left2` shares the column.
    expect(findNearest(masonry[from], others, 'down')).toBe('left2');
  });
});
