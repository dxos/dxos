//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { combinedSource, patchSource, recordChanges } from '@dxos/react-ui-canvas/headless';
import { Scene } from '@dxos/scene';

import { applyLayoutIntent, layoutSource } from './layout-source.ts';

describe('layoutSource', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    const created = await builder.createDatabase();
    created.graph.registry.add([Scene.Layout3D]);
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
