//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { IntentPluginProvides } from '@braneframe/plugin-intent';
import { PluginDefinition, findPlugin } from '@dxos/react-surface';

import { GraphContext } from './GraphContext';
import { Graph, GraphStore } from './graph';
import { GraphPluginProvides, WithPlugins } from './types';
import { graphPlugins } from './util';

/**
 * Manages the state of the graph for the application.
 * Enables other plugins to register node builders to add nodes to the graph.
 * This includes actions and annotation each other's nodes.
 */
export const GraphPlugin = (): PluginDefinition<GraphPluginProvides> => {
  const graph = new GraphStore();

  return {
    meta: {
      id: 'dxos.org/plugin/graph',
    },
    ready: async (plugins) => {
      const intentPlugin = findPlugin<IntentPluginProvides>(plugins, 'dxos.org/plugin/intent');
      graph._setSendIntent(intentPlugin?.provides.intent.sendIntent);

      graphPlugins(plugins)
        .map((plugin) => plugin.provides.graph.withPlugins)
        .filter((withPlugins): withPlugins is WithPlugins => !!withPlugins)
        .forEach((builder) => graph.registerNodeBuilder(builder(plugins)));

      graphPlugins(plugins)
        .map((plugin) => plugin.provides.graph.nodes)
        .filter((nodes): nodes is Graph.NodeBuilder => !!nodes)
        .forEach((builder) => graph.registerNodeBuilder(builder));

      graph.construct();
    },
    provides: {
      context: ({ children }) => <GraphContext.Provider value={{ graph }}>{children}</GraphContext.Provider>,
      graph,
    },
  };
};
