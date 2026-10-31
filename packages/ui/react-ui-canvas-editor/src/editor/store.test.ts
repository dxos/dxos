//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, expect, test } from 'vitest';

import { type LayoutIntent } from '@dxos/scene';

import { createEditorStore, drillPath } from './store.ts';

describe('createEditorStore', () => {
  test('selection, tool and drill path are atoms the panels and viewport share', () => {
    const registry = Registry.make();
    const store = createEditorStore(registry);
    expect(registry.get(store.atoms.selection)).toEqual([]);
    expect(registry.get(store.atoms.tool)).toEqual({ id: 'select' });
    expect(registry.get(store.atoms.editing)).toEqual([]);

    // A panel writes through the store; the viewport reads the same atom.
    store.open(['root', 'gear']);
    store.select(['a', 'b']);
    store.setTool({ id: 'place', object: 'gear' });
    expect(registry.get(store.atoms.selection)).toEqual(['a', 'b']);
    expect(registry.get(store.atoms.tool)).toEqual({ id: 'place', object: 'gear' });
    expect(registry.get(store.atoms.editing)).toEqual(['root', 'gear']);
  });

  test('opening another layout clears the selection, as its elements are no longer drawn', () => {
    const registry = Registry.make();
    const store = createEditorStore(registry);
    store.select(['a']);
    store.open(['root', 'gear']);
    expect(registry.get(store.atoms.selection)).toEqual([]);
  });

  test("a path of the scene's own layout alone is no drill: the root is open", () => {
    const registry = Registry.make();
    const store = createEditorStore(registry);
    store.open(['root', 'gear']);
    store.open(['root']);
    expect(registry.get(store.atoms.editing)).toEqual([]);
  });

  test('a face belongs to its element: selecting anything else lets it go', () => {
    const registry = Registry.make();
    const store = createEditorStore(registry);
    store.select(['a']);
    store.setFace({ element: 'a', normal: { x: 0, y: 1, z: 0 } });
    store.select(['a', 'b']);
    expect(registry.get(store.atoms.face)).toBeDefined();
    store.select(['b']);
    expect(registry.get(store.atoms.face)).toBeUndefined();
  });

  test('a preview never writes the document; committing writes it once', () => {
    const registry = Registry.make();
    const written: { layout: string; intent: LayoutIntent }[] = [];
    const store = createEditorStore(registry, { onIntent: (layout, intent) => written.push({ layout, intent }) });
    for (let step = 1; step <= 5; step++) {
      store.preview('root', { kind: 'update', id: 'a', path: ['center'], value: { x: step, y: 0 } });
    }
    expect(written).toEqual([]);
    expect(registry.get(store.atoms.preview)?.intent).toMatchObject({ value: { x: 5, y: 0 } });

    store.commit();
    expect(written).toEqual([
      { layout: 'root', intent: { kind: 'update', id: 'a', path: ['center'], value: { x: 5, y: 0 } } },
    ]);
    expect(registry.get(store.atoms.preview)).toBeUndefined();
  });

  test('a cancelled preview writes nothing', () => {
    const registry = Registry.make();
    const written: LayoutIntent[] = [];
    const store = createEditorStore(registry, { onIntent: (_layout, intent) => written.push(intent) });
    store.preview('root', { kind: 'delete', ids: ['a'] });
    store.preview(undefined);
    store.commit();
    expect(written).toEqual([]);
  });
});

describe('drillPath', () => {
  test('opening a layout below the open one drills one level further in', () => {
    expect(drillPath([], 'root', 'b')).toEqual(['root', 'b']);
    expect(drillPath(['root', 'b'], 'root', 'e')).toEqual(['root', 'b', 'e']);
  });

  test('opening a layout already on the path drills out to it; the root is no drill', () => {
    expect(drillPath(['root', 'b', 'e'], 'root', 'b')).toEqual(['root', 'b']);
    expect(drillPath(['root', 'b', 'e'], 'root', 'root')).toEqual([]);
    expect(drillPath(['root', 'b'], 'root', undefined)).toEqual([]);
  });
});
