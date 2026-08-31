//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, expect, test } from 'vitest';

import * as GraphNode from '@dxos/graph/GraphNode';

import * as Graph from './AppGraph';
import * as GraphBuilder from './AppGraphBuilder';

const TYPE = 'org.dxos.type.example';

const label = (registry: Registry.AtomRegistry, graph: Graph.Graph, id: string) =>
  Option.getOrUndefined(registry.get(graph.node(id)))?.properties?.label;

/**
 * `addNodes` merges onto the node already in the graph, and the builder applies a whole flush inside
 * one {@link Graph.batch}, which bumps the model's version once at the end. Reading the node back
 * through its atom inside that batch yields the value from before it, so a second write in the same
 * flush would merge onto — and undo — the first.
 */
describe('writes read the graph as of the current mutation', () => {
  test('a second write in the same batch does not undo the first', () => {
    const registry = Registry.make();
    const graph = Graph.make({ registry });
    Graph.addNodes(graph, [{ id: 'a', type: TYPE, properties: { label: 'A' } }]);
    // Mounted, as a rendered view keeps it: an unmounted atom recomputes on read and hides this.
    const cancel = registry.subscribe(graph.node('a'), () => {});
    expect(label(registry, graph, 'a')).to.equal('A');

    Graph.batch(graph, () => {
      Graph.addNodes(graph, [{ id: 'a', type: TYPE, properties: { label: 'B' } }]);
      // A second producer of the same node, contributing a different property.
      Graph.addNodes(graph, [{ id: 'a', type: TYPE, properties: { icon: 'ph--cube--regular' } }]);
    });

    expect(label(registry, graph, 'a')).to.equal('B');
    expect(Option.getOrUndefined(registry.get(graph.node('a')))?.properties?.icon).to.equal('ph--cube--regular');
    cancel();
  });

  test('a write sees a node added earlier in the same batch', () => {
    const registry = Registry.make();
    const graph = Graph.make({ registry });
    const cancel = registry.subscribe(graph.node('a'), () => {});
    expect(registry.get(graph.node('a')).pipe(Option.isNone)).to.be.true;

    Graph.batch(graph, () => {
      Graph.addNodes(graph, [{ id: 'a', type: TYPE, properties: { label: 'A' } }]);
      Graph.addNodes(graph, [{ id: 'a', type: TYPE, properties: { icon: 'ph--cube--regular' } }]);
    });

    expect(label(registry, graph, 'a')).to.equal('A');
    cancel();
  });
});

/**
 * A relation read before its node exists is deferred, and applied when the node arrives — which
 * happens inside the flush batch. The connector subscribed at that moment reads the node back
 * through its atom, so it must see the node the batch just wrote.
 */
describe('expansion deferred until the node arrives', () => {
  test('a connector subscribed inside the flush batch sees the node', async () => {
    const registry = Registry.make();
    const builder = GraphBuilder.make({ registry });
    GraphBuilder.addExtension(
      builder,
      GraphBuilder.createExtensionRaw({
        id: 'tree',
        connector: (node) =>
          Atom.make((get) =>
            Option.match(get(node), {
              onNone: () => [],
              onSome: (source) =>
                source.id === GraphNode.RootId ? [{ id: 'a', type: TYPE }] : [{ id: 'b', type: TYPE }],
            }),
          ),
      }),
    );
    const graph = builder.graph;
    const children = (id: string) => registry.get(graph.connections(id, 'child')).map(({ id }) => id);

    // Read the grandchild relation before `root/a` exists, as a rendered tree does.
    Graph.expandSync(graph, 'root/a', 'child');
    Graph.expandSync(graph, GraphNode.RootId, 'child');
    await GraphBuilder.flush(builder);

    expect(children(GraphNode.RootId)).to.deep.equal(['root/a']);
    expect(children('root/a')).to.deep.equal(['root/a/b']);
  });
});
