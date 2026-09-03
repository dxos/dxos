//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, expect, test } from 'vitest';

import * as GraphNode from '@dxos/graph/GraphNode';

import * as Graph from './AppGraph';
import * as GraphBuilder from './AppGraphBuilder';

const TYPE = 'org.dxos.type.collection';

/**
 * The nav-tree shape the composer `collections` e2e exercises: a workspace whose collections come
 * from one reactive list, each collection's children from the same list keyed by parent.
 */
const setup = () => {
  const registry = Registry.make();
  const builder = GraphBuilder.make({ registry });
  // parent id -> child ids.
  const tree = Atom.make<Record<string, string[]>>({ [GraphNode.RootId]: [] }).pipe(Atom.keepAlive);

  GraphBuilder.addExtension(
    builder,
    GraphBuilder.createExtensionRaw({
      id: 'collections',
      connector: (node) =>
        Atom.make((get) =>
          Option.match(get(node), {
            onNone: () => [],
            onSome: (source) => {
              const segment = source.id.slice(source.id.lastIndexOf('/') + 1);
              return (get(tree)[segment] ?? []).map((id) => ({ id, type: TYPE, data: { id } }));
            },
          }),
        ),
    }),
  );

  const graph = builder.graph;
  const children = (id: string) => registry.get(graph.connections(id, 'child')).map(({ id }) => id);
  return { registry, builder, graph, tree, children };
};

// Written while chasing a composer `collections` e2e failure. None of these reproduce it — they are
// kept because the behaviours they pin (cascading removal through a materialized subtree, actions
// arriving with child expansion, position-ordered siblings across a re-order) had no coverage.
describe('expansion and removal through a materialized subtree', () => {
  test('actions materialize on a node reached by child expansion', async () => {
    const registry = Registry.make();
    const builder = GraphBuilder.make({ registry });
    GraphBuilder.addExtension(
      builder,
      GraphBuilder.createExtensionRaw({
        id: 'collections',
        connector: () => Atom.make([{ id: 'a', type: TYPE, data: { id: 'a' } }]),
        actions: () => Atom.make([{ id: 'rename', data: () => Effect.void, properties: { label: 'Rename' } }]),
      }),
    );

    const graph = builder.graph;
    Graph.expandSync(graph, GraphNode.RootId, 'child');
    await GraphBuilder.flush(builder);

    // The action relation is expanded alongside child, so the item menu is populated without an
    // explicit expand — this is what the collections e2e drives when it opens an item's menu.
    const actions = registry.get(graph.actions(GraphNode.RootId));
    expect(actions.map(({ id }) => id)).to.deep.equal(['root/rename']);

    Graph.expandSync(graph, 'root/a', 'child');
    await GraphBuilder.flush(builder);
    expect(registry.get(graph.actions('root/a')).map(({ id }) => id)).to.deep.equal(['root/a/rename']);
  });

  test('siblings ordered by position survive a re-order', async () => {
    const registry = Registry.make();
    const builder = GraphBuilder.make({ registry });
    const positions = Atom.make<Record<string, number>>({ a: 1, b: 2, c: 3 }).pipe(Atom.keepAlive);
    GraphBuilder.addExtension(
      builder,
      GraphBuilder.createExtensionRaw({
        id: 'collections',
        connector: () =>
          Atom.make((get) =>
            Object.entries(get(positions)).map(([id, position]) => ({
              id,
              type: TYPE,
              data: { id },
              properties: { position },
            })),
          ),
      }),
    );

    const graph = builder.graph;
    const children = () => registry.get(graph.connections(GraphNode.RootId, 'child')).map(({ id }) => id);
    Graph.expandSync(graph, GraphNode.RootId, 'child');
    await GraphBuilder.flush(builder);
    expect(children()).to.deep.equal(['root/a', 'root/b', 'root/c']);

    registry.set(positions, { a: 3, b: 2, c: 1 });
    await GraphBuilder.flush(builder);
    expect(children()).to.deep.equal(['root/c', 'root/b', 'root/a']);
  });

  test('deleting a collection removes it and its descendants', async () => {
    const { registry, builder, graph, tree, children } = setup();
    registry.set(tree, { [GraphNode.RootId]: ['a'], a: ['b'], b: ['c'] });

    Graph.expandSync(graph, GraphNode.RootId, 'child');
    await GraphBuilder.flush(builder);
    Graph.expandSync(graph, 'root/a', 'child');
    await GraphBuilder.flush(builder);
    Graph.expandSync(graph, 'root/a/b', 'child');
    await GraphBuilder.flush(builder);

    expect(children(GraphNode.RootId)).to.deep.equal(['root/a']);
    expect(children('root/a')).to.deep.equal(['root/a/b']);
    expect(children('root/a/b')).to.deep.equal(['root/a/b/c']);

    // Delete the containing collection: it and its descendants leave the source data at once.
    registry.set(tree, { [GraphNode.RootId]: [] });
    await GraphBuilder.flush(builder);

    expect(children(GraphNode.RootId)).to.deep.equal([]);
    expect(Graph.getNode(graph, 'root/a').pipe(Option.isNone)).to.be.true;
    expect(Graph.getNode(graph, 'root/a/b').pipe(Option.isNone)).to.be.true;
    expect(Graph.getNode(graph, 'root/a/b/c').pipe(Option.isNone)).to.be.true;
  });

  test('re-ordering siblings keeps every sibling attached', async () => {
    const { registry, builder, graph, tree, children } = setup();
    registry.set(tree, { [GraphNode.RootId]: ['a', 'b', 'c'] });

    Graph.expandSync(graph, GraphNode.RootId, 'child');
    await GraphBuilder.flush(builder);
    expect(children(GraphNode.RootId)).to.deep.equal(['root/a', 'root/b', 'root/c']);

    registry.set(tree, { [GraphNode.RootId]: ['c', 'a', 'b'] });
    await GraphBuilder.flush(builder);
    expect(children(GraphNode.RootId)).to.deep.equal(['root/c', 'root/a', 'root/b']);

    registry.set(tree, { [GraphNode.RootId]: ['b', 'c'] });
    await GraphBuilder.flush(builder);
    expect(children(GraphNode.RootId)).to.deep.equal(['root/b', 'root/c']);
    expect(Graph.getNode(graph, 'root/a').pipe(Option.isNone)).to.be.true;
  });
});
