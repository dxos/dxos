//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { filterPlugins, type GraphProvides, type PluginDefinition, parseGraphBuilderPlugin } from '@dxos/app-framework';
import { GraphBuilder } from '@dxos/app-graph';

import { GraphContext } from './GraphContext';
import meta, { GRAPH_PLUGIN } from './meta';

const KEY = `${GRAPH_PLUGIN}/app-graph`;

/**
 * Manages the state of the graph for the application.
 * Enables other plugins to register node builders to add nodes to the graph.
 * This includes actions and annotation each other's nodes.
 */
export const GraphPlugin = (): PluginDefinition<GraphProvides> => {
  const builder = GraphBuilder.from(localStorage.getItem(KEY) ?? undefined);
  let interval: NodeJS.Timeout | undefined;

  return {
    meta,
    ready: async ({ plugins }) => {
      interval = setInterval(() => {
        localStorage.setItem(`${GRAPH_PLUGIN}/graph`, builder.graph.pickle());
      }, 5_000);

      filterPlugins(plugins, parseGraphBuilderPlugin).forEach((plugin) =>
        builder.addExtension(plugin.provides.graph.builder(plugins)),
      );

      await builder.initialize();
      await builder.graph.expand(builder.graph.root);

      // Expose the graph to the window for debugging.
      const composer = (window as any).composer;
      if (typeof composer === 'object') {
        composer.graph = builder.graph;
      }
    },
    unload: async () => {
      clearInterval(interval);
    },
    provides: {
      graph: builder.graph,
      // TODO(wittjosiah): This is janky to expose this function in this way.
      explore: (options) => builder.explore(options),
      context: ({ children }) => (
        <GraphContext.Provider value={{ graph: builder.graph }}>{children}</GraphContext.Provider>
      ),
    },
  };
};
