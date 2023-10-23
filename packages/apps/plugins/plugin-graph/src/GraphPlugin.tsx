//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { GraphBuilder } from '@dxos/app-graph';
import {
  filterPlugins,
  type GraphPluginProvides,
  type PluginDefinition,
  parseGraphBuilderPlugin,
} from '@dxos/react-surface';

import { GraphContext } from './GraphContext';

/**
 * Manages the state of the graph for the application.
 * Enables other plugins to register node builders to add nodes to the graph.
 * This includes actions and annotation each other's nodes.
 */
export const GraphPlugin = (): PluginDefinition<GraphPluginProvides> => {
  const builder = new GraphBuilder();
  const graph = builder.build();

  return {
    meta: {
      id: 'dxos.org/plugin/graph',
    },
    ready: async (plugins) => {
      filterPlugins(plugins, parseGraphBuilderPlugin).forEach((plugin) =>
        builder.addNodeBuilder(plugin.meta.id, (parent) => plugin.provides.graph.builder({ parent, plugins })),
      );

      builder.build(graph);
    },
    provides: {
      context: ({ children }) => <GraphContext.Provider value={{ graph }}>{children}</GraphContext.Provider>,
      graph,
    },
  };
};
