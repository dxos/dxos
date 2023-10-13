//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type IntentPluginProvides } from '@braneframe/plugin-intent';
import { type PluginDefinition, findPlugin } from '@dxos/react-surface';

import { GraphContext } from './GraphContext';
import { type Graph, GraphBuilder, type NodeBuilder } from './graph';
import { type GraphPluginProvides, type WithPlugins } from './types';
import { graphPlugins } from './util';

/**
 * Manages the state of the graph for the application.
 * Enables other plugins to register node builders to add nodes to the graph.
 * This includes actions and annotation each other's nodes.
 */
export const GraphPlugin = (): PluginDefinition<GraphPluginProvides> => {
  const state: { graph?: Graph } = {}; // TODO(burdon): Use signal?

  return {
    meta: {
      id: 'dxos.org/plugin/graph',
    },
    ready: async (plugins) => {
      const intentPlugin = findPlugin<IntentPluginProvides>(plugins, 'dxos.org/plugin/intent');
      const builder = new GraphBuilder(intentPlugin?.provides.intent.dispatch);

      // TODO(burdon): Unify.
      graphPlugins(plugins)
        .map((plugin) => [plugin.meta.id, plugin.provides.graph.withPlugins])
        .filter((withPlugins): withPlugins is [string, WithPlugins] => !!withPlugins[1])
        .forEach(([id, nodeBuilder]) => builder.addNodeBuilder(id, nodeBuilder(plugins)));

      graphPlugins(plugins)
        .map((plugin) => [plugin.meta.id, plugin.provides.graph.nodes])
        .filter((nodes): nodes is [string, NodeBuilder] => !!nodes[1])
        .forEach(([id, nodeBuilder]) => builder.addNodeBuilder(id, nodeBuilder));

      state.graph = builder.build();
    },
    provides: {
      context: ({ children }) => (
        <GraphContext.Provider value={{ graph: state.graph! }}>{children}</GraphContext.Provider>
      ),
      graph: () => state.graph!,
    },
  };
};
