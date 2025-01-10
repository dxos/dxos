//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework/next';
import { GraphBuilder } from '@dxos/app-graph';

import { GRAPH_PLUGIN } from './meta';

const KEY = `${GRAPH_PLUGIN}/app-graph`;

export default async (context: PluginsContext) => {
  const builder = GraphBuilder.from(localStorage.getItem(KEY) ?? undefined);
  const interval = setInterval(() => {
    localStorage.setItem(`${GRAPH_PLUGIN}/graph`, builder.graph.pickle());
  }, 5_000);

  context.requestCapabilities(Capabilities.AppGraphBuilder).forEach((extension) => builder.addExtension(extension));

  await builder.initialize();
  await builder.graph.expand(builder.graph.root);

  // Expose the graph to the window for debugging.
  const composer = (window as any).composer;
  if (typeof composer === 'object') {
    composer.graph = builder.graph;
  }

  return contributes(
    Capabilities.AppGraph,
    { graph: builder.graph, explore: (options) => builder.explore(options) },
    () => {
      clearInterval(interval);
    },
  );
};
