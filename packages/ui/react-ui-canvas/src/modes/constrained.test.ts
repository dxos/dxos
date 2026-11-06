//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Scene, applyIntent } from '@dxos/scene';

import { constrainedConstrain, constrainedPlacement } from './constrained.ts';

const shape = (id: string): Scene.Element2D => ({
  id,
  type: 'rect',
  center: { x: 0, y: 0 },
  size: { width: 192, height: 128 },
});

const LAYOUT: Scene.LayoutRecord2D = {
  id: 'l',
  dim: '2d',
  elements: Object.fromEntries(['A', 'B', 'C', 'D'].map((id) => [id, shape(id)])),
  constraints: [
    { subject: 'B', relation: 'east', object: 'A' },
    { subject: 'B', relation: 'aligned', object: 'A' },
    { subject: 'C', relation: 'south', object: 'A' },
    { subject: 'D', relation: 'south', object: 'B' },
    { subject: 'D', relation: 'east', object: 'C' },
  ],
};

/** The layout with its shapes where its constraints place them. */
const solved = (layout: Scene.LayoutRecord2D): Scene.LayoutRecord2D =>
  applyIntent(layout, constrainedPlacement(layout));

const centerOf = (layout: Scene.LayoutRecord2D, id: string) => {
  const center = layout.elements[id]?.center;
  if (!center) {
    throw new Error(`no centre for ${id}`);
  }
  return center;
};

describe('constrained mode', () => {
  test("the layout's constraints place its shapes: east/west, north/south and aligned", ({ expect }) => {
    const layout = solved(LAYOUT);
    expect(centerOf(layout, 'B').x).toBeGreaterThan(centerOf(layout, 'A').x);
    expect(centerOf(layout, 'B').y).toBe(centerOf(layout, 'A').y);
    expect(centerOf(layout, 'C').y).toBeGreaterThan(centerOf(layout, 'A').y);
    expect(centerOf(layout, 'D').x).toBeGreaterThan(centerOf(layout, 'C').x);
  });

  test('the solver re-places after a move, which rewrites the moved shape against its nearest neighbour', ({
    expect,
  }) => {
    const layout = solved(LAYOUT);
    const a = centerOf(layout, 'A');
    const c = centerOf(layout, 'C');
    // Drop C to the right of A, on A's row.
    const result = constrainedConstrain(layout, {
      kind: 'move',
      ids: ['C'],
      delta: { x: a.x + 300 - c.x, y: a.y - c.y },
    });
    expect(result?.constraints.filter(({ subject }) => subject === 'C')).toEqual([
      { subject: 'C', relation: 'east', object: 'B' },
      { subject: 'C', relation: 'aligned', object: 'B' },
    ]);
    const moved = result && applyIntent(layout, result.intent);
    expect(moved && centerOf(moved, 'C').x).toBeGreaterThan(centerOf(layout, 'A').x);
    expect(moved && centerOf(moved, 'C').y).toBe(moved && centerOf(moved, 'A').y);
  });

  test('a delete drops the constraints naming the shape', ({ expect }) => {
    const result = constrainedConstrain(solved(LAYOUT), { kind: 'delete', ids: ['A'] });
    expect(result?.constraints.some(({ subject, object }) => subject === 'A' || object === 'A')).toBe(false);
  });

  test('renaming the layout keeps the model', ({ expect }) => {
    const renamed = solved({ ...LAYOUT, id: 'renamed', name: 'Renamed' });
    expect(renamed.elements).toEqual(solved(LAYOUT).elements);
    expect(renamed.constraints).toEqual(LAYOUT.constraints);
  });
});
