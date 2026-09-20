//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { createFreehandProjection } from '../model/projection.ts';
import { type ConstrainedModel, createConstrainedProjection } from '../model/projections/constrained.ts';
import { createMemoryStore } from '../model/store.ts';
import { createSceneTree } from './testing.ts';
import { type UndoState, emptyUndo, redo, undo, withUndo } from './undo.ts';

const setup = () => {
  const registry = Registry.make();
  const { scenes, root } = createSceneTree(1, 'r');
  const store = createMemoryStore(scenes);
  const atom = Atom.keepAlive(Atom.make<UndoState>(emptyUndo()));
  const projection = withUndo(createFreehandProjection({ registry, store, sceneId: root }), registry, atom, root);
  const centerOf = (id: string) => registry.get(projection.scene).nodes[id]?.center;
  return { registry, root, atom, projection, centerOf };
};

describe('undo', () => {
  test('each applied intent is one undo step; redo replays it; a new edit clears redo', ({ expect }) => {
    const { registry, root, atom, projection, centerOf } = setup();
    const start = centerOf('scene:r/a');
    projection.apply({ kind: 'move', ids: ['scene:r/a'], delta: { x: 64, y: 0 } });
    projection.apply({ kind: 'move', ids: ['scene:r/a'], delta: { x: 64, y: 0 } });
    expect(centerOf('scene:r/a')).toEqual({ x: start.x + 128, y: start.y });
    expect(registry.get(atom).past.length).toBe(2);

    expect(undo(projection, registry, atom, root)).toBe(true);
    expect(centerOf('scene:r/a')).toEqual({ x: start.x + 64, y: start.y });
    expect(undo(projection, registry, atom, root)).toBe(true);
    expect(centerOf('scene:r/a')).toEqual(start);
    expect(undo(projection, registry, atom, root)).toBe(false);

    expect(redo(projection, registry, atom, root)).toBe(true);
    expect(centerOf('scene:r/a')).toEqual({ x: start.x + 64, y: start.y });

    projection.apply({ kind: 'delete', ids: ['scene:r/t'] });
    expect(registry.get(atom).future).toEqual([]);
    expect(redo(projection, registry, atom, root)).toBe(false);
  });

  test('a rejected intent records nothing and another scene starts an empty log', ({ expect }) => {
    const { registry, root, atom, projection } = setup();
    projection.apply({ kind: 'move', ids: ['missing'], delta: { x: 1, y: 1 } });
    expect(registry.get(atom).past.length).toBe(0);
    projection.apply({ kind: 'move', ids: ['scene:r/a'], delta: { x: 1, y: 1 } });
    expect(registry.get(atom).past.length).toBe(1);
    expect(undo(projection, registry, atom, 'other')).toBe(false);
    expect(undo(projection, registry, atom, root)).toBe(true);
  });

  test('a constrained projection restores its constraint model', ({ expect }) => {
    const registry = Registry.make();
    const model = Atom.keepAlive(
      Atom.make<ConstrainedModel>({
        nodes: [{ id: 'A' }, { id: 'B' }],
        constraints: [{ subject: 'B', relation: 'east', object: 'A' }],
      }),
    );
    const atom = Atom.keepAlive(Atom.make<UndoState>(emptyUndo()));
    const projection = withUndo(createConstrainedProjection({ registry, model }), registry, atom, 'c');
    const before = registry.get(model);
    projection.apply({ kind: 'delete', ids: ['B'] });
    expect(registry.get(model).nodes.length).toBe(1);
    expect(undo(projection, registry, atom, 'c')).toBe(true);
    expect(registry.get(model)).toBe(before);
  });
});
