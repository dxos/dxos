//
// Copyright 2025 DXOS.org
//

import { Option, Record } from 'effect';

import { Capabilities, contributes, type PluginContext } from '@dxos/app-framework';
import { flattenExtensions, GraphBuilder, type ExpandableGraph, ROOT_ID } from '@dxos/app-graph';

// import { GRAPH_PLUGIN } from './meta';

// const KEY = `${GRAPH_PLUGIN}/app-graph`;

export default async (context: PluginContext) => {
  const registry = context.getCapability(Capabilities.RxRegistry);
  const builder = GraphBuilder.from(/* localStorage.getItem(KEY) ?? */ undefined, registry);
  // const interval = setInterval(() => {
  //   localStorage.setItem(KEY, builder.graph.pickle());
  // }, 5_000);

  const unsubscribe = registry.subscribe(
    context.capabilities(Capabilities.AppGraphBuilder),
    (extensions) => {
      const next = flattenExtensions(extensions);
      const current = Record.values(registry.get(builder.extensions));
      const removed = current.filter(({ id }) => !next.some(({ id: nextId }) => nextId === id));
      removed.forEach((extension) => builder.removeExtension(extension.id));
      next.forEach((extension) => builder.addExtension(extension));
    },
    { immediate: true },
  );

  // TODO(wittjosiah): Stop expanding the graph eagerly.
  builder.graph.onNodeChanged.on(({ id, node }) => {
    if (Option.isSome(node)) {
      void builder.graph.expand(id);
    }
  });
  // await builder.initialize();
  void builder.graph.expand(ROOT_ID);

  setupDevtools(builder.graph);

  return contributes(Capabilities.AppGraph, { graph: builder.graph, explore: builder.explore }, () => {
    // clearInterval(interval);
    unsubscribe();
  });
};

// Expose the graph to the window for debugging.
const setupDevtools = (graph: ExpandableGraph) => {
  (globalThis as any).composer ??= {};
  (globalThis as any).composer.graph = graph;
};
