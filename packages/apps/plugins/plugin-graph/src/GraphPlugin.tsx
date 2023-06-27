//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { PluginDefinition } from '@dxos/react-surface';

import { GraphContext } from './GraphContext';
import { GraphContextValue, GraphPluginProvides } from './types';
import { graphPlugins } from './util';

export const GraphPlugin = (
  graph: GraphContextValue = {
    roots: {},
    actions: {},
  },
): PluginDefinition<GraphPluginProvides> => {
  return {
    meta: {
      id: 'dxos:graph',
    },
    ready: async (plugins) => {
      for (const plugin of graphPlugins(plugins)) {
        const nodes = plugin.provides.graph.nodes?.(plugins);
        if (nodes) {
          graph.roots[plugin.meta.id] = nodes;
        }

        const actions = plugin.provides.graph.actions?.(plugins);
        if (actions) {
          graph.actions[plugin.meta.id] = actions;
        }
      }
    },
    provides: {
      graph,
      context: ({ children }) => {
        return <GraphContext.Provider value={graph}>{children}</GraphContext.Provider>;
      },
    },
  };
};
