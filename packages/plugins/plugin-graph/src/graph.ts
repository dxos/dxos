//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { type Graph, GraphBuilder } from '@dxos/app-graph';

import { GRAPH_PLUGIN } from './meta';

const KEY = `${GRAPH_PLUGIN}/app-graph`;

export default async (context: PluginsContext) => {
  const builder = GraphBuilder.from(localStorage.getItem(KEY) ?? undefined);
  const interval = setInterval(() => {
    localStorage.setItem(KEY, builder.graph.pickle());
  }, 5_000);

  context.requestCapabilities(Capabilities.AppGraphBuilder).forEach((extension) => builder.addExtension(extension));

  await builder.initialize();
  await builder.graph.expand(builder.graph.root);

  setupDevtools(builder.graph);

  return contributes(
    Capabilities.AppGraph,
    { graph: builder.graph, explore: (options) => builder.explore(options) },
    () => clearInterval(interval),
  );
};

// Expose the graph to the window for debugging.
const setupDevtools = (graph: Graph) => {
  (globalThis as any).composer ??= {};
  (globalThis as any).composer.graph = graph;
};
