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

const WORKSPACES = 10;
const CHILDREN = 20;

/** Effect drops an unmounted atom on a scheduled task, so reclamation is not observable inline. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

const workspaceIds = () => Array.from({ length: WORKSPACES }, (_, index) => `w${index}`);

/** Root fans out to workspaces, each of which fans out to its own items. */
const setup = () => {
  const registry = Registry.make();
  const builder = GraphBuilder.make({ registry });
  GraphBuilder.addExtension(
    builder,
    GraphBuilder.createExtensionRaw({
      id: 'workspaces',
      connector: (node) =>
        Atom.make((get) =>
          Option.match(get(node), {
            onNone: () => [],
            onSome: (source) =>
              source.id === GraphNode.RootId
                ? workspaceIds().map((id) => ({ id, type: 'workspace' }))
                : Array.from({ length: CHILDREN }, (_, index) => ({ id: `c${index}`, type: 'item' })),
          }),
        ),
    }),
  );

  return { registry, builder, graph: builder.graph };
};

/** What a rendered nav tree does to a workspace: expand it, mount its rows, then navigate away. */
const visit = async (
  { registry, builder, graph }: ReturnType<typeof setup>,
  id: string,
  { mounted = true }: { mounted?: boolean } = {},
) => {
  Graph.expandSync(graph, id, 'child');
  await GraphBuilder.flush(builder);
  if (!mounted) {
    return;
  }

  const cancels = registry
    .get(graph.connections(id, 'child'))
    .map((child) => registry.subscribe(graph.connections(child.id, 'child'), () => {}));
  await settle();
  cancels.forEach((cancel) => cancel());
  await settle();
};

const counts = ({ registry, builder, graph }: ReturnType<typeof setup>) => {
  const internal = Graph.getInternal(graph);
  return {
    registryNodes: registry.getNodes().size,
    modelNodes: internal._model.nodes.length,
    modelEdges: internal._model.edges.length,
    subscriptions: builder._subscriptions.size,
    connectors: builder._connectorPrevious.size,
    provenance: builder._nodeExtensions.size,
    expanded: internal._expanded.size,
    relations: internal._relations.size,
  };
};

describe('retention', () => {
  test('the atom registry reclaims what is no longer mounted', async () => {
    const harness = setup();
    const { registry, graph } = harness;
    await visit(harness, GraphNode.RootId);
    for (const id of workspaceIds()) {
      await visit(harness, `${GraphNode.RootId}/${id}`, { mounted: false });
    }
    await settle();
    const idle = counts(harness).registryNodes;

    // Mount every row of every workspace, as a fully expanded nav tree would.
    const cancels = workspaceIds().flatMap((id) =>
      registry
        .get(graph.connections(`${GraphNode.RootId}/${id}`, 'child'))
        .map((child) => registry.subscribe(graph.connections(child.id, 'child'), () => {})),
    );
    expect(counts(harness).registryNodes).to.be.greaterThan(idle + WORKSPACES * CHILDREN);

    cancels.forEach((cancel) => cancel());
    await settle();

    // View atoms mounted above the graph (a rendered row's subscriptions) are reclaimed on unmount:
    // `Atom.family` memoizes weakly, and the registry drops a node once it has no listener and no
    // dependents, cascading to its parents. The graph's own node atoms are deliberately NOT in that
    // pool — every materialized node holds a mount (see `_pin`), so its atoms stay live until
    // released, and a subscriber never finds a node's atom dropped and re-created between reads.
    expect(counts(harness).registryNodes).to.equal(idle);
  });

  test('a node atom is pinned for as long as the node is in the graph', async () => {
    const harness = setup();
    const { registry, builder, graph } = harness;
    await visit(harness, GraphNode.RootId);
    const root = `${GraphNode.RootId}/w0`;
    await visit(harness, root);
    await settle();

    // No subscriber anywhere, yet the node atoms stay in the registry: the graph mounts them.
    const child = `${root}/c0`;
    const pinned = registry.getNodes().size;
    expect(registry.getNodes().has(graph.node(child))).to.be.true;

    // Releasing the subgraph cancels the mounts; the registry drops the atoms.
    const internal = Graph.getInternal(graph);
    GraphBuilder.release(builder, [root, ...internal._model.descendants(root, Graph.relationKey('child'))]);
    await settle();
    expect(registry.getNodes().has(graph.node(child))).to.be.false;
    expect(registry.getNodes().size).to.be.lessThan(pinned);
  });

  test('the graph itself does grow with every node ever materialized', async () => {
    const harness = setup();
    await visit(harness, GraphNode.RootId);
    const before = counts(harness);
    for (const id of workspaceIds()) {
      await visit(harness, `${GraphNode.RootId}/${id}`);
    }

    const after = counts(harness);
    // Nothing here is mounted any more, yet every visited workspace's items are still in the model,
    // still carry provenance, and still hold an expansion subscription. This is what release is for.
    expect(after.modelNodes - before.modelNodes).to.equal(WORKSPACES * CHILDREN);
    expect(after.provenance - before.provenance).to.equal(WORKSPACES * CHILDREN);
    expect(after.subscriptions - before.subscriptions).to.equal(WORKSPACES);
  });

  test('releasing a subgraph reclaims it', async () => {
    const harness = setup();
    const { builder, graph } = harness;
    await visit(harness, GraphNode.RootId);
    const baseline = counts(harness);

    for (const id of workspaceIds()) {
      await visit(harness, `${GraphNode.RootId}/${id}`);
    }
    expect(counts(harness).modelNodes).to.equal(baseline.modelNodes + WORKSPACES * CHILDREN);

    const internal = Graph.getInternal(graph);
    for (const id of workspaceIds()) {
      const root = `${GraphNode.RootId}/${id}`;
      GraphBuilder.release(builder, internal._model.descendants(root, Graph.relationKey('child')));
    }
    await settle();

    const after = counts(harness);
    expect(after.modelNodes).to.equal(baseline.modelNodes);
    expect(after.modelEdges).to.equal(baseline.modelEdges);
    expect(after.provenance).to.equal(baseline.provenance);
    expect(after.relations).to.equal(baseline.relations);
  });

  test('a released subgraph re-expands from its connectors on the next read', async () => {
    const harness = setup();
    const { registry, builder, graph } = harness;
    const root = `${GraphNode.RootId}/w0`;
    await visit(harness, GraphNode.RootId);
    await visit(harness, root);

    const before = registry.get(graph.connections(root, 'child')).map(({ id }) => id);
    expect(before).to.have.length(CHILDREN);

    const internal = Graph.getInternal(graph);
    GraphBuilder.release(builder, [root, ...internal._model.descendants(root, Graph.relationKey('child'))]);
    await settle();
    expect(registry.get(graph.connections(root, 'child'))).to.deep.equal([]);

    // Re-expanding rebuilds the same subgraph: release is an unload, not a deletion.
    Graph.expandSync(graph, GraphNode.RootId, 'child');
    await GraphBuilder.flush(builder);
    Graph.expandSync(graph, root, 'child');
    await GraphBuilder.flush(builder);
    expect(registry.get(graph.connections(root, 'child')).map(({ id }) => id)).to.deep.equal(before);
  });

  test('releasing one subgraph does not disturb another', async () => {
    const harness = setup();
    const { registry, builder, graph } = harness;
    await visit(harness, GraphNode.RootId);
    await visit(harness, `${GraphNode.RootId}/w0`);
    await visit(harness, `${GraphNode.RootId}/w1`);

    const retained = `${GraphNode.RootId}/w1`;
    let notifications = 0;
    const cancel = registry.subscribe(graph.connections(retained, 'child'), () => notifications++);
    // The first read of a subscribed atom notifies, so count from after the mount.
    registry.get(graph.connections(retained, 'child'));
    notifications = 0;

    const internal = Graph.getInternal(graph);
    const released = `${GraphNode.RootId}/w0`;
    GraphBuilder.release(builder, [released, ...internal._model.descendants(released, Graph.relationKey('child'))]);
    await settle();

    expect(notifications).to.equal(0);
    expect(registry.get(graph.connections(retained, 'child'))).to.have.length(CHILDREN);
    cancel();
  });
});
