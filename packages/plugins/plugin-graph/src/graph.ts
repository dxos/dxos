//
// Copyright 2025 DXOS.org
//

import * as Record from 'effect/Record';

import { Capability, Common } from '@dxos/app-framework';
import { Graph, GraphBuilder, Node } from '@dxos/app-graph';

// TODO(wittjosiah): Remove or restore graph caching.
// import { meta } from './meta';

// const KEY = `${meta.id}/app-graph`;

export default Capability.makeModule(async (context) => {
  const registry = context.getCapability(Common.Capability.AtomRegistry);
  const builder = GraphBuilder.from(/* localStorage.getItem(KEY) ?? */ undefined, registry);
  // const interval = setInterval(() => {
  //   localStorage.setItem(KEY, builder.graph.pickle());
  // }, 5_000);

  const unsubscribe = registry.subscribe(
    context.capabilities(Common.Capability.AppGraphBuilder),
    (extensions) => {
      const next = GraphBuilder.flattenExtensions(extensions);
      const current = Record.values(registry.get(builder.extensions));
      const removed = current.filter(({ id }) => !next.some(({ id: nextId }) => nextId === id));
      removed.forEach((extension) => GraphBuilder.removeExtension(builder, extension.id));
      next.forEach((extension) => GraphBuilder.addExtension(builder, extension));
    },
    { immediate: true },
  );

  // await builder.initialize();
  void Graph.expand(builder.graph, Node.RootId);

  setupDevtools(builder.graph);

  return Capability.contributes(
    Common.Capability.AppGraph,
    { graph: builder.graph, explore: GraphBuilder.explore },
    () => {
      // clearInterval(interval);
      unsubscribe();
    },
  );
});

// Expose the graph to the window for debugging.
const setupDevtools = (graph: Graph.ExpandableGraph) => {
  (globalThis as any).composer ??= {};
  (globalThis as any).composer.graph = graph;
};
