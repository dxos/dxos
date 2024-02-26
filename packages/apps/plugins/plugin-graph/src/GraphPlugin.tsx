//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { filterPlugins, type GraphProvides, type PluginDefinition, parseGraphBuilderPlugin } from '@dxos/app-framework';
import { GraphBuilder } from '@dxos/app-graph';

import { GraphContext } from './GraphContext';
import meta from './meta';

/**
 * Manages the state of the graph for the application.
 * Enables other plugins to register node builders to add nodes to the graph.
 * This includes actions and annotation each other's nodes.
 */
export const GraphPlugin = (): PluginDefinition<GraphProvides> => {
  const builder = new GraphBuilder();
  const graph = builder.build();

  return {
    meta,
    ready: async (plugins) => {
      filterPlugins(plugins, parseGraphBuilderPlugin).forEach((plugin) =>
        builder.addExtension(plugin.meta.id, (graph) => plugin.provides.graph.builder(plugins, graph)),
      );

      builder.build(graph);
    },
    provides: {
      graph,
      context: ({ children }) => <GraphContext.Provider value={{ graph }}>{children}</GraphContext.Provider>,
    },
  };
};
