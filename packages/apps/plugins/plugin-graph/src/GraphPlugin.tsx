//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { IntentPluginProvides } from '@braneframe/plugin-intent';
import { PluginDefinition, findPlugin } from '@dxos/react-surface';

import { GraphContext } from './GraphContext';
import { Graph, GraphBuilder, GraphImpl } from './graph';
import { GraphPluginProvides, WithPlugins } from './types';
import { graphPlugins } from './util';

/**
 * Manages the state of the graph for the application.
 * Enables other plugins to register node builders to add nodes to the graph.
 * This includes actions and annotation each other's nodes.
 */
export const GraphPlugin = (): PluginDefinition<GraphPluginProvides> => {
  const builder = new GraphBuilder();
  const result: { graph?: GraphImpl } = {};

  return {
    meta: {
      id: 'dxos.org/plugin/graph',
    },
    ready: async (plugins) => {
      const intentPlugin = findPlugin<IntentPluginProvides>(plugins, 'dxos.org/plugin/intent');
      builder._setSendIntent(intentPlugin?.provides.intent.sendIntent);

      graphPlugins(plugins)
        .map((plugin) => plugin.provides.graph.withPlugins)
        .filter((withPlugins): withPlugins is WithPlugins => !!withPlugins)
        .forEach((nodeBuilder) => builder.addNodeBuilder(nodeBuilder(plugins)));

      graphPlugins(plugins)
        .map((plugin) => plugin.provides.graph.nodes)
        .filter((nodes): nodes is Graph.NodeBuilder => !!nodes)
        .forEach((nodeBuilder) => builder.addNodeBuilder(nodeBuilder));

      result.graph = builder.build();
    },
    // TODO(burdon): Enable providers to be functions (avoid result object).
    provides: {
      context: ({ children }) => (
        <GraphContext.Provider value={{ graph: result.graph! }}>{children}</GraphContext.Provider>
      ),
      graph: result.graph!,
    },
  };
};
