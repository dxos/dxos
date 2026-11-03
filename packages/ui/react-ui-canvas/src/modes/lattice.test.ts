//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type LayoutIntent, type Scene, applyIntent } from '@dxos/scene';

import { DEFAULT_LATTICE } from '../utils/index.ts';
import { latticeConstrain } from './lattice.ts';

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
  lattice: DEFAULT_LATTICE,
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

  test('a layout with no lattice is not constrained', ({ expect }) => {
    const { lattice: _lattice, ...free } = layoutOf(cellElement('a', 0, 0), cellElement('b', 1, 0));
    const intent: LayoutIntent = { kind: 'move', ids: ['a'], delta: { x: 384, y: 0 } };
    expect(latticeConstrain(free, intent)).toBe(intent);
  });
});
