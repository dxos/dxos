//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type LayoutIntent, type Scene, applyIntent } from '@dxos/scene';

import { type LatticeSpec } from '../utils/index.ts';
import { latticeConstrain } from './lattice.ts';

// The lattice these positions are worked out on: a pitch of 384 by 192.
const LATTICE: LatticeSpec = { width: 256, height: 128, gutterX: 128, gutterY: 64 };

/** A one-cell shape at lattice cell (`col`, `row`). */
const cellElement = (id: string, col: number, row: number): Scene.Element2D => ({
  id,
  type: 'rect',
  center: { x: col * 384, y: row * 192 },
  size: { width: 256, height: 128 },
});

const layoutOf = (...elements: Scene.Element2D[]): Scene.LayoutRecord2D => ({
  id: 'l',
  dim: '2d',
  lattice: LATTICE,
  elements: Object.fromEntries(elements.map((element) => [element.id, element])),
});

/** The layout `intent` leaves, once constrained; undefined when refused. */
const after = (layout: Scene.LayoutRecord2D, intent: LayoutIntent) => {
  const constrained = latticeConstrain(layout, intent);
  return constrained && applyIntent(layout, constrained);
};

describe('latticeConstrain', () => {
  test('a created element snaps onto the lattice', ({ expect }) => {
    const loose: Scene.Element2D = {
      id: 'n',
      type: 'rect',
      center: { x: 30, y: -20 },
      size: { width: 300, height: 90 },
    };
    const intent = latticeConstrain(layoutOf(), { kind: 'create', element: loose });
    expect(intent?.kind === 'create' && intent.element).toMatchObject({
      center: { x: 0, y: 0 },
      size: { width: 256, height: 128 },
    });
  });

  test('a move lands on whole lattice cells', ({ expect }) => {
    const layout = layoutOf(cellElement('a', 0, 0), cellElement('b', 1, 0));
    // Most of a pitch down: both land one row down.
    const moved = after(layout, { kind: 'move', ids: ['a', 'b'], delta: { x: 20, y: 170 } });
    expect(moved?.elements.a.center).toEqual({ x: 0, y: 192 });
    expect(moved?.elements.b.center).toEqual({ x: 384, y: 192 });
  });

  test('an element may not be created, moved or resized onto occupied cells', ({ expect }) => {
    const layout = layoutOf(cellElement('a', 0, 0), cellElement('b', 2, 0));
    expect(latticeConstrain(layout, { kind: 'create', element: cellElement('c', 0, 0) })).toBeUndefined();
    // Two pitches right lands on b.
    expect(latticeConstrain(layout, { kind: 'move', ids: ['a'], delta: { x: 768, y: 0 } })).toBeUndefined();
    // Widening a to three cells (centred) reaches columns -1 and 1, which are free; to five it reaches b.
    expect(latticeConstrain(layout, { kind: 'scale', ids: ['a'], factor: { width: 4, height: 1 } })).toBeDefined();
    expect(latticeConstrain(layout, { kind: 'scale', ids: ['a'], factor: { width: 7, height: 1 } })).toBeUndefined();
  });

  test('elements moved together may pass each other but not land on one left behind', ({ expect }) => {
    const layout = layoutOf(cellElement('a', 0, 0), cellElement('b', 1, 0));
    expect(latticeConstrain(layout, { kind: 'move', ids: ['a', 'b'], delta: { x: 384, y: 0 } })).toBeDefined();
    expect(latticeConstrain(layout, { kind: 'move', ids: ['a'], delta: { x: 384, y: 0 } })).toBeUndefined();
  });

  test('a geometry update snaps, a whole-element write included; any other update passes through', ({ expect }) => {
    const layout = layoutOf(cellElement('a', 0, 0));
    const center = after(layout, { kind: 'update', id: 'a', path: ['center'], value: { x: 400, y: 10 } });
    expect(center?.elements.a.center).toEqual({ x: 384, y: 0 });
    const whole = after(layout, {
      kind: 'update',
      id: 'a',
      path: [],
      value: { ...cellElement('a', 0, 0), center: { x: 10, y: 180 } },
    });
    expect(whole?.elements.a.center).toEqual({ x: 0, y: 192 });
    const label: LayoutIntent = { kind: 'update', id: 'a', path: ['label'], value: 'A' };
    expect(latticeConstrain(layout, label)).toBe(label);
  });

  test('a batch is refused whole when any step overlaps', ({ expect }) => {
    const layout = layoutOf(cellElement('a', 0, 0));
    const batch = latticeConstrain(layout, {
      kind: 'batch',
      intents: [
        { kind: 'create', element: cellElement('b', 1, 0) },
        { kind: 'create', element: cellElement('c', 1, 0) },
      ],
    });
    expect(batch).toBeUndefined();
  });

  test('guides, links and elements without their own size are off the lattice and move as given', ({ expect }) => {
    const guide: Scene.Element2D = { ...cellElement('g', 0, 0), overrides: { guide: true } };
    const placed: Scene.Element2D = { id: 'p', object: 'box', center: { x: 0, y: 0 } };
    const layout = layoutOf(guide, placed, cellElement('a', 2, 2));
    const moved = after(layout, { kind: 'move', ids: ['g', 'p'], delta: { x: 10, y: 7 } });
    expect(moved?.elements.g.center).toEqual({ x: 10, y: 7 });
    expect(moved?.elements.p.center).toEqual({ x: 10, y: 7 });
  });

  test('a hull takes no cells: a shape lands on a cell its frame covers, whatever its style', ({ expect }) => {
    // A hull's frame covers the shapes inside it, so as a shape of the lattice it would refuse every move among them.
    const hull: Scene.Element2D = {
      id: 'h',
      type: 'hull',
      center: { x: 192, y: 0 },
      size: { width: 768, height: 192 },
      overrides: { tone: 2, lineStyle: 'solid' },
    };
    const layout = layoutOf(hull, cellElement('a', 0, 0));
    const moved = after(layout, { kind: 'move', ids: ['a'], delta: { x: 384, y: 0 } });
    expect(moved?.elements.a.center).toEqual({ x: 384, y: 0 });
  });

  test("a composite's parts are left where they are given, about its own centre", ({ expect }) => {
    const parts: Scene.LayoutRecord2D = { ...layoutOf(cellElement('a', 0, 0)), kind: 'composite' };
    const intent: LayoutIntent = { kind: 'move', ids: ['a'], delta: { x: -192, y: -96 } };
    expect(latticeConstrain(parts, intent)).toBe(intent);
  });

  test('a layout with no lattice is not constrained', ({ expect }) => {
    const { lattice: _lattice, ...free } = layoutOf(cellElement('a', 0, 0), cellElement('b', 1, 0));
    const intent: LayoutIntent = { kind: 'move', ids: ['a'], delta: { x: 384, y: 0 } };
    expect(latticeConstrain(free, intent)).toBe(intent);
  });

  test('a new lattice keeps every shape on the cells it had, placed in the same step', ({ expect }) => {
    const wider = { width: 192, height: 96, gutterX: 96, gutterY: 96 };
    const guide: Scene.Element2D = { ...cellElement('g', 5, 5), overrides: { guide: true } };
    const layout = layoutOf(cellElement('a', 0, 0), cellElement('b', 1, 0), cellElement('c', -2, 3), guide);
    const next = after(layout, { kind: 'layout', patch: { grid: 12, lattice: wider } });
    expect([next?.lattice, next?.grid]).toEqual([wider, 12]);
    expect(Object.values(next?.elements ?? {}).map(({ id, center, size }) => [id, center, size])).toEqual([
      ['a', { x: 0, y: 0 }, { width: 192, height: 96 }],
      ['b', { x: 288, y: 0 }, { width: 192, height: 96 }],
      ['c', { x: -576, y: 576 }, { width: 192, height: 96 }],
      ['g', guide.center, guide.size],
    ]);
    // The same lattice written again, and any other field of the layout, moves nothing.
    const same: LayoutIntent = { kind: 'layout', patch: { lattice: LATTICE } };
    const grid: LayoutIntent = { kind: 'layout', patch: { grid: 8 } };
    expect([latticeConstrain(layout, same), latticeConstrain(layout, grid)]).toEqual([same, grid]);
  });

  test('the steps after a new lattice in a batch are checked on it, not on the one before', ({ expect }) => {
    const wider = { width: 192, height: 96, gutterX: 96, gutterY: 96 };
    const layout = layoutOf(cellElement('a', 0, 0), cellElement('b', 1, 0));
    // B is written where the new lattice seats it: a frame that covers A's cell and its own on the old one.
    const next = after(layout, {
      kind: 'batch',
      intents: [
        { kind: 'layout', patch: { lattice: wider } },
        { kind: 'update', id: 'b', path: ['center'], value: { x: 288, y: 0 } },
        { kind: 'move', ids: ['b'], delta: { x: 300, y: 0 } },
      ],
    });
    expect([next?.elements.a.center, next?.elements.b.center]).toEqual([
      { x: 0, y: 0 },
      { x: 576, y: 0 },
    ]);
  });
});
