//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type LayoutIntent, type Scene, applyIntent } from '@dxos/scene';

import { DEFAULT_LATTICE } from '../utils/index.ts';
import { dynamicConstrain } from './dynamic.ts';

const shape = (id: string, center = { x: 0, y: 0 }): Scene.Element2D => ({
  id,
  type: 'rect',
  center,
  size: { width: 192, height: 128 },
});

const link = (id: string, from: string, to: string): Scene.Element2D => ({
  id,
  type: 'link',
  source: { node: from },
  target: { node: to },
});

/** A dynamic layout: its shapes are the graph's nodes and its links the graph's edges. */
const layoutOf = (...elements: Scene.Element2D[]): Scene.LayoutRecord2D => ({
  id: 'l',
  dim: '2d',
  arrange: { kind: 'dynamic' },
  elements: Object.fromEntries(elements.map((element) => [element.id, element])),
});

/** The layout `intent` leaves, once constrained. */
const after = (layout: Scene.LayoutRecord2D, intent: LayoutIntent): Scene.LayoutRecord2D => {
  const constrained = dynamicConstrain(layout, intent);
  if (!constrained) {
    throw new Error('Dynamic mode refuses no edit.');
  }
  return applyIntent(layout, constrained);
};

const centerOf = (layout: Scene.LayoutRecord2D, id: string) => {
  const center = layout.elements[id]?.center;
  if (!center) {
    throw new Error(`no centre for ${id}`);
  }
  return center;
};

const GRAPH = [
  shape('root'),
  shape('left'),
  shape('right'),
  shape('leaf'),
  link('e1', 'root', 'left'),
  link('e2', 'root', 'right'),
];

describe('dynamicConstrain', () => {
  test('a graph edit re-places the shapes in rows along the links', ({ expect }) => {
    const placed = after(layoutOf(...GRAPH), { kind: 'bind', link: link('e3', 'left', 'leaf') });
    expect(centerOf(placed, 'left').y).toBeGreaterThan(centerOf(placed, 'root').y);
    expect(centerOf(placed, 'leaf').y).toBeGreaterThan(centerOf(placed, 'left').y);
    expect(centerOf(placed, 'left').y).toBe(centerOf(placed, 'right').y);
    expect(centerOf(placed, 'left').x).not.toBe(centerOf(placed, 'right').x);
    expect(placed.elements.e3).toBeDefined();
  });

  test('a moved shape is pinned where it was dropped and survives a later graph edit', ({ expect }) => {
    const placed = after(layoutOf(...GRAPH), { kind: 'bind', link: link('e3', 'left', 'leaf') });
    const at = { x: 1000, y: -500 };
    // The 2D engine writes a drag as the whole element, which pins it as a move would.
    const dropped = after(placed, {
      kind: 'update',
      id: 'leaf',
      path: [],
      value: { ...placed.elements.leaf, center: at },
    });
    expect(dropped.elements.leaf.pinned).toBe(true);
    const grown = after(dropped, { kind: 'create', element: shape('extra') });
    expect(centerOf(grown, 'leaf')).toEqual(at);
    const moved = after(grown, { kind: 'move', ids: ['root'], delta: { x: 5, y: 5 } });
    expect(moved.elements.root.pinned).toBe(true);
  });

  test('deleting a shape takes its links and re-places the rest', ({ expect }) => {
    const placed = after(layoutOf(...GRAPH), { kind: 'bind', link: link('e3', 'left', 'leaf') });
    const pruned = after(placed, { kind: 'delete', ids: ['left'] });
    expect(Object.keys(pruned.elements).sort()).toEqual(['e2', 'leaf', 'right', 'root']);
    expect(centerOf(pruned, 'right').y).toBeGreaterThan(centerOf(pruned, 'root').y);
  });

  test('on a lattice, shapes sit one per cell', ({ expect }) => {
    const layout: Scene.LayoutRecord2D = { ...layoutOf(...GRAPH), lattice: DEFAULT_LATTICE };
    const placed = after(layout, { kind: 'bind', link: link('e3', 'left', 'leaf') });
    const pitch = {
      x: DEFAULT_LATTICE.width + DEFAULT_LATTICE.gutterX,
      y: DEFAULT_LATTICE.height + DEFAULT_LATTICE.gutterY,
    };
    const cells = ['root', 'left', 'right', 'leaf'].map((id) => {
      const { x, y } = centerOf(placed, id);
      expect(Math.abs(x % pitch.x)).toBe(0);
      expect(Math.abs(y % pitch.y)).toBe(0);
      return `${x},${y}`;
    });
    expect(new Set(cells).size).toBe(4);
  });

  test('an edit that leaves the graph as it was is written as given', ({ expect }) => {
    const layout = layoutOf(...GRAPH);
    const label: LayoutIntent = { kind: 'update', id: 'root', path: ['label'], value: 'Root' };
    expect(dynamicConstrain(layout, label)).toBe(label);
  });

  test('a layout that is not dynamic is not re-placed', ({ expect }) => {
    const { arrange: _arrange, ...free } = layoutOf(...GRAPH);
    const bind: LayoutIntent = { kind: 'bind', link: link('e3', 'left', 'leaf') };
    expect(dynamicConstrain(free, bind)).toBe(bind);
  });
});
