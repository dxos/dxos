//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { combinedSource, patchSource, recordChanges } from '@dxos/react-ui-canvas/headless';
import { Scene } from '@dxos/scene';

import { applyLayoutIntent, layoutRecord, layoutSource } from './layout-source.ts';
import { plain } from './records.ts';

describe('layoutSource', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    const created = await builder.createDatabase();
    created.graph.registry.add([Scene.Layout3D, Scene.Layout2D]);
    db = created.db;
  });

  afterEach(async () => {
    await builder.close();
  });

  const layout = (key: string, ids: string[]) =>
    db.add(
      Obj.make(Scene.Layout3D, {
        key,
        elements: Object.fromEntries(
          ids.map((id, index) => [id, { id, type: 'cube', center: { x: index, y: 0, z: 0 } }]),
        ),
      }),
    );

  test('apply, undo restores the elements, and redo reapplies', () => {
    const root = layout('root', ['a', 'b']);
    const source = layoutSource(root);
    const [change] = recordChanges([source], () =>
      applyLayoutIntent(root, { kind: 'move', ids: ['a'], delta: { x: 0, y: 2, z: 0 } }),
    );
    expect(root.elements.a.center).toEqual({ x: 0, y: 2, z: 0 });
    expect(change).toBeDefined();
    if (!change) {
      return;
    }
    expect(patchSource(source, { from: change.after, to: change.before, paths: change.paths }).written).toBeGreaterThan(
      0,
    );
    expect(root.elements.a.center).toEqual({ x: 0, y: 0, z: 0 });
    patchSource(source, { from: change.before, to: change.after, paths: change.paths });
    expect(root.elements.a.center).toEqual({ x: 0, y: 2, z: 0 });
  });

  test('a 2D layout: undoing a create removes the element and redo makes it again', () => {
    const root = db.add(Obj.make(Scene.Layout2D, { key: 'root', elements: {} }));
    const source = layoutSource(root);
    const element = { id: 'r', type: 'rect', center: { x: 0, y: 0 }, size: { width: 64, height: 64 } };
    const [change] = recordChanges([source], () => applyLayoutIntent(root, { kind: 'create', element }));
    expect(root.elements.r?.center).toEqual({ x: 0, y: 0 });
    if (!change) {
      throw new Error('The create was recorded.');
    }
    patchSource(source, { from: change.after, to: change.before, paths: change.paths });
    expect(root.elements.r).toBeUndefined();
    patchSource(source, { from: change.before, to: change.after, paths: change.paths });
    expect(root.elements.r?.size).toEqual({ width: 64, height: 64 });
  });

  test('a layout intent writes the constraints with the elements, and undo and redo restore both', () => {
    const before: Scene.Constraint[] = [{ subject: 'b', relation: 'east', object: 'a' }];
    const after: Scene.Constraint[] = [{ subject: 'b', relation: 'south', object: 'a' }];
    const shape = (id: string, x: number) => ({
      id,
      type: 'rect',
      center: { x, y: 0 },
      size: { width: 64, height: 64 },
    });
    const root = db.add(
      Obj.make(Scene.Layout2D, {
        key: 'root',
        elements: { a: shape('a', 0), b: shape('b', 128) },
        constraints: before,
      }),
    );
    const source = layoutSource(root);
    const [change] = recordChanges([source], () =>
      applyLayoutIntent(root, {
        kind: 'batch',
        intents: [
          { kind: 'update', id: 'b', path: ['center'], value: { x: 0, y: 128 } },
          {
            kind: 'layout',
            patch: { constraints: after, lattice: { width: 64, height: 64, gutterX: 32, gutterY: 32 } },
          },
        ],
      }),
    );
    expect(plain(root.constraints)).toEqual(after);
    expect(root.lattice?.width).toBe(64);
    expect(root.elements.b.center).toEqual({ x: 0, y: 128 });
    if (!change) {
      throw new Error('The change was recorded.');
    }
    patchSource(source, { from: change.after, to: change.before, paths: change.paths });
    expect(plain(root.constraints)).toEqual(before);
    expect(root.lattice).toBeUndefined();
    expect(root.elements.b.center).toEqual({ x: 128, y: 0 });
    patchSource(source, { from: change.before, to: change.after, paths: change.paths });
    expect(plain(root.constraints)).toEqual(after);
    expect(root.lattice?.width).toBe(64);
    expect(root.elements.b.center).toEqual({ x: 0, y: 128 });
  });

  test('a layout intent writes the drawing grid, and undo unsets it', () => {
    const root = db.add(Obj.make(Scene.Layout2D, { key: 'root', elements: {} }));
    const source = layoutSource(root);
    const [change] = recordChanges([source], () => applyLayoutIntent(root, { kind: 'layout', patch: { grid: 32 } }));
    expect(root.grid).toBe(32);
    expect(layoutRecord(root)).toMatchObject({ grid: 32 });
    if (!change) {
      throw new Error('The change was recorded.');
    }
    patchSource(source, { from: change.after, to: change.before, paths: change.paths });
    expect(root.grid).toBeUndefined();
  });

  test('a grid pitch under one, or not finite, is refused, since snapping divides by it', () => {
    const root = db.add(Obj.make(Scene.Layout2D, { key: 'root', elements: {}, grid: 32 }));
    // `Infinity` passes `>= 1`, and `Math.round(v / Infinity) * Infinity` is `NaN` just as a zero pitch is.
    for (const grid of [0, -8, Number.POSITIVE_INFINITY, Number.NaN]) {
      applyLayoutIntent(root, { kind: 'layout', patch: { grid } });
      expect(root.grid, String(grid)).toBe(32);
    }
    applyLayoutIntent(root, { kind: 'layout', patch: { grid: 12 } });
    expect(root.grid).toBe(12);
  });

  test('a batch carrying a refused pitch writes none of it, not even the elements it moves', () => {
    const root = db.add(
      Obj.make(Scene.Layout2D, {
        key: 'root',
        elements: { a: { id: 'a', type: 'rect', center: { x: 0, y: 0 } } },
        grid: 32,
      }),
    );
    applyLayoutIntent(root, {
      kind: 'batch',
      intents: [
        { kind: 'move', ids: ['a'], delta: { x: 48, y: 0 } },
        { kind: 'layout', patch: { grid: 0 } },
      ],
    });
    // The move was computed against a pitch the layout never took, so it would leave the batch applied in part.
    expect(root.elements.a.center).toEqual({ x: 0, y: 0 });
    expect(root.grid).toBe(32);
  });

  test('a layout intent writes what a new layout is (a composite, its anonymity) with its elements, and undo unsets it', () => {
    const group = db.add(Obj.make(Scene.Layout2D, { key: 'group', elements: {} }));
    const source = layoutSource(group);
    const [change] = recordChanges([source], () =>
      applyLayoutIntent(group, {
        kind: 'batch',
        intents: [
          { kind: 'create', element: { id: 'a', type: 'rect', center: { x: 0, y: 0 } } },
          { kind: 'layout', patch: { kind: 'composite', anonymous: true } },
        ],
      }),
    );
    expect(group.kind).toBe('composite');
    expect(group.anonymous).toBe(true);
    if (!change) {
      throw new Error('The change was recorded.');
    }
    patchSource(source, { from: change.after, to: change.before, paths: change.paths });
    expect(group.kind).toBeUndefined();
    expect(group.anonymous).toBeUndefined();
    expect(group.elements.a).toBeUndefined();
  });

  test('undo skips an element someone else changed since', () => {
    const root = layout('root', ['a']);
    const source = layoutSource(root);
    const [change] = recordChanges([source], () =>
      applyLayoutIntent(root, { kind: 'move', ids: ['a'], delta: { x: 1, y: 0, z: 0 } }),
    );
    // A remote peer moves the same element after the change.
    Obj.update(root, (root) => {
      root.elements.a.center = { x: 9, y: 9, z: 9 };
    });
    if (!change) {
      throw new Error('The move was recorded.');
    }
    const result = patchSource(source, { from: change.after, to: change.before, paths: change.paths });
    expect(result.skipped).toBeGreaterThan(0);
    expect(result.written).toBe(0);
    expect(root.elements.a.center).toEqual({ x: 9, y: 9, z: 9 });
  });

  test('a change across a root layout and a parts layout undoes both', () => {
    const root = layout('root', ['a']);
    const parts = layout('parts', ['b']);
    const source = combinedSource({ root: layoutSource(root), parts: layoutSource(parts) });
    const [change] = recordChanges([source], () => {
      applyLayoutIntent(root, { kind: 'delete', ids: ['a'] });
      applyLayoutIntent(parts, { kind: 'move', ids: ['b'], delta: { x: 0, y: 0, z: 5 } });
    });
    expect(root.elements.a).toBeUndefined();
    if (!change) {
      throw new Error('The change was recorded.');
    }
    patchSource(source, { from: change.after, to: change.before, paths: change.paths });
    expect(root.elements.a).toBeDefined();
    expect(parts.elements.b.center).toEqual({ x: 0, y: 0, z: 0 });
  });

  test('an intent that changes nothing writes nothing', () => {
    const root = layout('root', ['a']);
    const before = Obj.version(root).automergeHeads;
    applyLayoutIntent(root, { kind: 'move', ids: ['missing'], delta: { x: 1, y: 0, z: 0 } });
    expect(Obj.version(root).automergeHeads).toEqual(before);
  });
});
