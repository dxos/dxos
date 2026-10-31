//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, expect, test } from 'vitest';

import { type ConstrainIntent, atomSource, constrainedPlacement } from '@dxos/react-ui-canvas';
import { type LayoutIntent, type Scene, applyIntent } from '@dxos/scene';

import { createHistory } from '../editor/index.ts';
import { createConfig2D } from './config2d.tsx';

const document: Scene.SceneDocument = {
  scenes: [{ id: 's', dim: '2d', layout: 'root', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
  layouts: [
    {
      id: 'root',
      dim: '2d',
      elements: {
        a: { id: 'a', type: 'rect', center: { x: 100, y: 0 }, size: { width: 100, height: 100 } },
        b: { id: 'b', type: 'rect', center: { x: 500, y: 200 }, size: { width: 100, height: 100 } },
      },
    },
  ],
  models: [],
};

describe('config2d', () => {
  test('reset is actual size with the content centred in the view, not the origin', () => {
    const config = createConfig2D();
    const size = { width: 800, height: 600 };
    const camera = config.camera.reset({ x: 0, y: 0, zoom: 1 }, document, 'root', size);
    expect(camera.zoom).toBe(1);
    // The content's centre (300, 100) lands on the view's centre (400, 300).
    expect((300 + camera.x) * camera.zoom).toBe(400);
    expect((100 + camera.y) * camera.zoom).toBe(300);
  });
  test('a layout with a lattice snaps a move onto its cells while snapping is on', () => {
    const lattice: Scene.LayoutRecord2D = {
      id: 'grid',
      dim: '2d',
      lattice: { width: 256, height: 128, gutterX: 128, gutterY: 64 },
      elements: { a: { id: 'a', type: 'rect', center: { x: 0, y: 0 }, size: { width: 256, height: 128 } } },
    };
    const { constrain } = createConfig2D();
    const move: LayoutIntent = { kind: 'move', ids: ['a'], delta: { x: 300, y: 20 } };
    const snapped = constrain?.(lattice, move, { snap: true });
    expect(snapped && applyIntent(lattice, snapped).elements.a.center).toEqual({ x: 384, y: 0 });
    expect(constrain?.(lattice, move, { snap: false })).toBe(move);
    // A layout with no lattice is free.
    const { lattice: _lattice, ...free } = lattice;
    expect(constrain?.(free, move, { snap: true })).toBe(move);
    // A host's own mode stands in for the layout's.
    const own: ConstrainIntent = (_layout, intent) => intent;
    expect(createConfig2D({ constrain: own }).constrain).toBe(own);
  });
  test('a dynamic layout pins a moved shape and re-places the rest when its graph changes', () => {
    const shape = (id: string): Scene.Element2D => ({
      id,
      type: 'rect',
      center: { x: 0, y: 0 },
      size: { width: 192, height: 128 },
    });
    const dynamic: Scene.LayoutRecord2D = {
      id: 'graph',
      dim: '2d',
      arrange: { kind: 'dynamic' },
      elements: { a: shape('a'), b: shape('b') },
    };
    const { constrain } = createConfig2D();
    const bind: LayoutIntent = {
      kind: 'bind',
      link: { id: 'ab', type: 'link', source: { node: 'a' }, target: { node: 'b' } },
    };
    const linked = constrain?.(dynamic, bind, { snap: true });
    const placed = linked && applyIntent(dynamic, linked);
    expect(placed?.elements.b.center?.y).toBeGreaterThan(placed?.elements.a.center?.y ?? Infinity);
    const move: LayoutIntent = { kind: 'move', ids: ['a'], delta: { x: 10, y: 0 } };
    const moved = constrain?.(dynamic, move, { snap: false });
    expect(moved && applyIntent(dynamic, moved).elements.a.pinned).toBe(true);
  });
  test('a constrained layout re-relates a dropped shape and writes the new constraints in the same batch', () => {
    const shape = (id: string): Scene.Element2D => ({
      id,
      type: 'rect',
      center: { x: 0, y: 0 },
      size: { width: 192, height: 128 },
    });
    const unsolved: Scene.LayoutRecord2D = {
      id: 'constrained',
      dim: '2d',
      elements: { a: shape('a'), b: shape('b'), c: shape('c') },
      constraints: [
        { subject: 'b', relation: 'east', object: 'a' },
        { subject: 'b', relation: 'aligned', object: 'a' },
        { subject: 'c', relation: 'south', object: 'a' },
      ],
    };
    const layout = applyIntent(unsolved, constrainedPlacement(unsolved));
    const a = layout.elements.a.center ?? { x: 0, y: 0 };
    const c = layout.elements.c.center ?? { x: 0, y: 0 };
    const { constrain } = createConfig2D();
    // Drop C well to the right of B, on A's row; snapping off does not free a constrained layout.
    const move: LayoutIntent = { kind: 'move', ids: ['c'], delta: { x: a.x + 600 - c.x, y: a.y - c.y } };
    const written = constrain?.(layout, move, { snap: false });
    const after = written && applyIntent(layout, written);
    expect(after?.constraints?.filter(({ subject }) => subject === 'c')).toEqual([
      { subject: 'c', relation: 'east', object: 'b' },
      { subject: 'c', relation: 'aligned', object: 'b' },
    ]);
    expect(after?.elements.c.center?.y).toBe(after?.elements.a.center?.y);
    expect(after?.elements.c.center?.x).toBeGreaterThan(after?.elements.b.center?.x ?? Infinity);
    // An edit that moves nothing leaves the constraints alone.
    const label: LayoutIntent = { kind: 'update', id: 'a', path: ['label'], value: 'A' };
    expect(constrain?.(layout, label, { snap: true })).toBe(label);
  });

  test('a constrained drag is one undo step for the positions and the constraints', () => {
    const shape = (id: string, x: number): Scene.Element2D => ({
      id,
      type: 'rect',
      center: { x, y: 0 },
      size: { width: 192, height: 128 },
    });
    const registry = Registry.make();
    const isLayouts = (value: unknown): value is Record<string, Scene.LayoutRecord2D> =>
      typeof value === 'object' && value !== null;
    const layouts = Atom.make<Record<string, Scene.LayoutRecord2D>>({
      root: { id: 'root', dim: '2d', elements: { a: shape('a', 0), b: shape('b', 400) }, constraints: [] },
    });
    const history = createHistory({
      steps: { done: [], undone: [] },
      source: atomSource(registry, layouts, isLayouts),
    });
    const before = registry.get(layouts).root;
    const { constrain } = createConfig2D();
    const intent = constrain?.(before, { kind: 'move', ids: ['b'], delta: { x: -380, y: 400 } }, { snap: true });
    expect(intent).toBeDefined();
    history.record(() => intent && registry.set(layouts, { root: applyIntent(before, intent) }));
    const after = registry.get(layouts).root;
    expect(after.constraints).toEqual([{ subject: 'b', relation: 'south', object: 'a' }]);
    history.undo();
    expect(registry.get(layouts).root.constraints).toEqual([]);
    expect(registry.get(layouts).root.elements).toEqual(before.elements);
    history.redo();
    expect(registry.get(layouts).root).toEqual(after);
  });
});
