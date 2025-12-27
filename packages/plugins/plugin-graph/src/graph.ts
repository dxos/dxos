//
// Copyright 2025 DXOS.org
//

import * as Record from 'effect/Record';

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { Graph, GraphBuilder } from '@dxos/app-graph';

// TODO(wittjosiah): Remove or restore graph caching.
// import { meta } from './meta';

// const KEY = `${meta.id}/app-graph`;

export default async (context: PluginContext) => {
  const registry = context.getCapability(Capabilities.AtomRegistry);
  const builder = GraphBuilder.from(/* localStorage.getItem(KEY) ?? */ undefined, registry);
  // const interval = setInterval(() => {
  //   localStorage.setItem(KEY, builder.graph.pickle());
  // }, 5_000);

  const unsubscribe = registry.subscribe(
    context.capabilities(Capabilities.AppGraphBuilder),
    (extensions) => {
      const next = GraphBuilder.flattenExtensions(extensions);
      const current = Record.values(registry.get(builder.extensions));
      const removed = current.filter(({ id }) => !next.some(({ id: nextId }) => nextId === id));
      removed.forEach((extension) => builder.removeExtension(extension.id));
      next.forEach((extension) => builder.addExtension(extension));
    },
    { immediate: true },
  );

  // await builder.initialize();
  void builder.graph.expand(Graph.ROOT_ID);

  setupDevtools(builder.graph);

  return contributes(Capabilities.AppGraph, { graph: builder.graph, explore: builder.explore }, () => {
    // clearInterval(interval);
    unsubscribe();
  });
};

// Expose the graph to the window for debugging.
const setupDevtools = (graph: Graph.ExpandableGraph) => {
  (globalThis as any).composer ??= {};
  (globalThis as any).composer.graph = graph;
};
