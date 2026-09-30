//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, expect, test } from 'vitest';

import { createStaticTreeModel } from '../../components/Tree/static-tree-model.ts';
import { type TreeModel } from '../../components/Tree/TreeContext.ts';
import { createCollection, createTreeWalkAtom } from './tree-collection.ts';

type Node = { id: string; items?: Node[] };

/** `roots` branches of `leaves` leaves each. */
const wide = (roots: number, leaves: number): Node => ({
  id: 'root',
  items: Array.from({ length: roots }, (_, branch) => ({
    id: `b${branch}`,
    items: Array.from({ length: leaves }, (_, leaf) => ({ id: `b${branch}-l${leaf}` })),
  })),
});

/** Counts which parents' `childIds` the walk reads. */
const spy = (model: TreeModel<Node>) => {
  const reads = new Set<string | undefined>();
  const spied: TreeModel<Node> = {
    ...model,
    childIds: (parentId) => {
      reads.add(parentId);
      return model.childIds(parentId);
    },
  };
  return { spied, reads };
};

describe('createTreeWalkAtom', () => {
  test('reads only open branches, and zag still sees closed ones as branches', () => {
    const registry = Registry.make();
    const model = createStaticTreeModel(wide(50, 99), { getChildren: (item) => item.items });
    const { spied, reads } = spy(model);
    const walk = registry.get(createTreeWalkAtom(spied, model.rootId, ['tree']));

    expect(walk.rows).toHaveLength(50);
    expect([...reads]).toEqual([model.rootId]);
    const collection = createCollection(walk.root);
    expect(collection.isBranchNode(walk.rows[0])).toBe(true);
    expect(collection.getNodeChildren(walk.rows[0])).toEqual([]);
  });

  test('opening a branch re-walks with its children, in visible order', () => {
    const registry = Registry.make();
    const model = createStaticTreeModel(wide(3, 2), { getChildren: (item) => item.items });
    const walkAtom = createTreeWalkAtom(model, model.rootId, ['tree']);
    registry.mount(walkAtom);

    const state = model.stateAtom(['tree', 'b1']);
    registry.set(state, { ...registry.get(state), open: true });
    const walk = registry.get(walkAtom);

    expect(walk.rows.map((row) => row.id)).toEqual(['b0', 'b1', 'b1-l0', 'b1-l1', 'b2']);
    expect(walk.expanded).toEqual(['tree+b1']);
    expect(walk.rows[2].indexPath).toEqual([1, 0]);
    expect(walk.rows[2].depth).toBe(2);
  });

  test('walks and indexes 5,000 open rows', () => {
    const registry = Registry.make();
    const model = createStaticTreeModel(wide(50, 99), { getChildren: (item) => item.items, isOpen: () => true });
    const start = performance.now();
    const walk = registry.get(createTreeWalkAtom(model, model.rootId, ['tree']));
    const collection = createCollection(walk.root);
    const walked = performance.now() - start;

    expect(walk.rows).toHaveLength(5_000);
    expect(collection.getIndexPath(walk.rows[4_999].value)).toEqual([49, 98]);
    // eslint-disable-next-line no-console
    console.log(`[tree-bench] walk+collection of 5000 rows: ${walked.toFixed(1)}ms`);
  });
});
