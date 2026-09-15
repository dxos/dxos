//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, expect, test } from 'vitest';

import { createStaticTreeModel } from './static-tree-model.ts';

type Node = { id: string; name?: string; items?: Node[] };

const makeTree = (): Node => ({
  id: 'root',
  items: [
    { id: 'a', name: 'Alpha', items: [{ id: 'a1', name: 'Alpha One' }, { id: 'a2' }] },
    { id: 'b', name: 'Beta' },
  ],
});

const make = (root: Node = makeTree()) =>
  createStaticTreeModel(root, {
    getChildren: (item) => item.items,
    getProps: (item) => (item.name ? { label: item.name } : {}),
  });

describe('createStaticTreeModel', () => {
  test('resolves topology from the source tree', () => {
    const registry = Registry.make();
    const model = make();

    expect(registry.get(model.childIds())).toEqual(['a', 'b']);
    expect(registry.get(model.childIds('a'))).toEqual(['a1', 'a2']);
    expect(registry.get(model.childIds('b'))).toEqual([]);
  });

  test('resolves items by id, and undefined for an unknown id', () => {
    const registry = Registry.make();
    const model = make();

    expect(registry.get(model.item('a1'))?.name).toEqual('Alpha One');
    expect(registry.get(model.item('nope'))).toBeUndefined();
  });

  test('derives props, letting getProps override the label', () => {
    const registry = Registry.make();
    const model = make();

    // Branch: parentOf and count derived from children.
    expect(registry.get(model.itemProps(['root', 'a']))).toMatchObject({
      id: 'a',
      label: 'Alpha',
      parentOf: ['a1', 'a2'],
      count: 2,
    });

    // Leaf: no parentOf/count, and the id stands in when getProps supplies no label.
    const leaf = registry.get(model.itemProps(['root', 'a', 'a2']));
    expect(leaf).toMatchObject({ id: 'a2', label: 'a2' });
    expect(leaf.parentOf).toBeUndefined();
    expect(leaf.count).toBeUndefined();
  });

  test('open state is per path, so one node at two paths stays independent', () => {
    const registry = Registry.make();
    const model = make();

    const here = ['root', 'a'];
    const elsewhere = ['root', 'b', 'a'];
    expect(registry.get(model.itemOpen(here))).toEqual(false);

    registry.set(model.stateAtom(here), { open: true, current: false });
    expect(registry.get(model.itemOpen(here))).toEqual(true);
    expect(registry.get(model.itemOpen(elsewhere))).toEqual(false);
  });

  test('current state is independent of open state', () => {
    const registry = Registry.make();
    const model = make();
    const path = ['root', 'b'];

    registry.set(model.stateAtom(path), { open: false, current: true });
    expect(registry.get(model.itemCurrent(path))).toEqual(true);
    expect(registry.get(model.itemOpen(path))).toEqual(false);
  });

  test('isOpen seeds the initial open state', () => {
    const registry = Registry.make();
    const model = createStaticTreeModel(makeTree(), {
      getChildren: (item) => item.items,
      isOpen: (item) => item.id === 'a',
    });

    expect(registry.get(model.itemOpen(['root', 'a']))).toEqual(true);
    expect(registry.get(model.itemOpen(['root', 'b']))).toEqual(false);
  });

  test('refresh republishes orderings after an in-place mutation', () => {
    const registry = Registry.make();
    const root = makeTree();
    const model = make(root);

    expect(registry.get(model.childIds('a'))).toEqual(['a1', 'a2']);

    // Reorder in place, the way a pragmatic-drag-and-drop reorder does.
    root.items![0].items!.reverse();
    model.refresh((atom, value) => registry.set(atom, value));

    expect(registry.get(model.childIds('a'))).toEqual(['a2', 'a1']);
  });

  test('refresh picks up a node moved to a new parent', () => {
    const registry = Registry.make();
    const root = makeTree();
    const model = make(root);

    const [moved] = root.items![0].items!.splice(0, 1);
    root.items![1].items = [moved];
    model.refresh((atom, value) => registry.set(atom, value));

    expect(registry.get(model.childIds('a'))).toEqual(['a2']);
    expect(registry.get(model.childIds('b'))).toEqual(['a1']);
  });
});
