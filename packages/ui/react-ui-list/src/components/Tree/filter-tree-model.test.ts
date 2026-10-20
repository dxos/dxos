//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, expect, test } from 'vitest';

import { filterTreeModel } from './filter-tree-model.ts';
import { createStaticTreeModel } from './static-tree-model.ts';
import { type TreeModel } from './tree-model.ts';

type Node = { id: string; name: string; items?: Node[] };

const make = () =>
  createStaticTreeModel<Node>(
    {
      id: 'root',
      name: 'Root',
      items: [
        {
          id: 'a',
          name: 'Alpha',
          items: [
            { id: 'a1', name: 'Apple' },
            { id: 'a2', name: 'Banana', items: [{ id: 'a2x', name: 'Cherry' }] },
          ],
        },
        { id: 'b', name: 'Beta', items: [{ id: 'b1', name: 'Date' }] },
        { id: 'c', name: 'Cherry pie' },
      ],
    },
    { getChildren: (item) => item.items },
  );

const named = (text: string) => (item: Node) => item.name.toLowerCase().includes(text);

describe('filterTreeModel', () => {
  test('keeps the matches and their ancestors, in order', () => {
    const registry = Registry.make();
    const filtered = filterTreeModel(make(), named('cherry'));
    expect(registry.get(filtered.childIds())).toEqual(['a', 'c']);
    expect(registry.get(filtered.childIds('a'))).toEqual(['a2']);
    expect(registry.get(filtered.childIds('a2'))).toEqual(['a2x']);
  });

  test("opens every match's ancestors and leaves the rest as they were", () => {
    const registry = Registry.make();
    const model = make();
    const filtered = filterTreeModel(model, named('cherry'));
    expect(registry.get(filtered.itemOpen(['root', 'a']))).toBe(true);
    expect(registry.get(filtered.itemOpen(['root', 'a', 'a2']))).toBe(true);
    // A match with nothing matching under it keeps its own state.
    expect(registry.get(filtered.itemOpen(['root', 'a', 'a2', 'a2x']))).toBe(false);
    expect(registry.get(model.itemOpen(['root', 'a']))).toBe(false);
  });

  test("counts a branch's kept children", () => {
    const registry = Registry.make();
    const filtered = filterTreeModel(make(), named('cherry'));
    expect(registry.get(filtered.itemProps(['root', 'a']))).toMatchObject({ parentOf: ['a2'], count: 1 });
    // A matching branch whose children do not match lists none.
    const beta = filterTreeModel(make(), named('beta'));
    expect(registry.get(beta.itemProps(['root', 'b']))).toMatchObject({ parentOf: [], count: 0 });
  });

  test('a cycle in the model does not recurse', () => {
    const registry = Registry.make();
    const loop: Node = { id: 'loop', name: 'Loop' };
    const model: TreeModel<Node> = {
      item: (id) => Atom.make(id === 'loop' ? loop : undefined),
      itemOpen: () => Atom.make(false),
      itemCurrent: () => Atom.make(false),
      itemProps: (path) => Atom.make({ id: path.at(-1) ?? '', label: 'Loop', parentOf: ['loop'] }),
      // The item is its own child.
      childIds: () => Atom.make(['loop']),
    };
    expect(registry.get(filterTreeModel(model, named('nothing')).childIds())).toEqual([]);
    expect(registry.get(filterTreeModel(model, named('loop')).childIds('loop'))).toEqual(['loop']);
  });
});
