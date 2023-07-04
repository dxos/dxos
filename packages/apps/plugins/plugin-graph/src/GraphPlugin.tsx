//
// Copyright 2023 DXOS.org
//

import { DeepSignal, deepSignal } from 'deepsignal/react';
import set from 'lodash.set';
import React from 'react';

import { PluginDefinition } from '@dxos/react-surface';

import { GraphContext } from './GraphContext';
import { GraphNode, GraphNodeAction, GraphPluginProvides } from './types';
import { ROOT, buildGraph } from './util';

export const GraphPlugin = (): PluginDefinition<GraphPluginProvides> => {
  const graph: DeepSignal<GraphNode> = deepSignal({
    id: 'root',
    label: 'Root',
    description: 'Root node',
    pluginChildren: {},
    pluginActions: {},
    get children(): GraphNode[] {
      return [];
    },
    get actions(): GraphNodeAction[] {
      return [];
    },
  });

  return {
    meta: {
      id: 'dxos:graph',
    },
    ready: async (plugins) => {
      const result = buildGraph(ROOT, plugins, (path, nodes) => set(graph, path, nodes));
      graph.pluginChildren = deepSignal(result.pluginChildren ?? {});
      graph.pluginActions = deepSignal(result.pluginActions ?? {});
    },
    provides: {
      graph,
      context: ({ children }) => {
        return <GraphContext.Provider value={graph}>{children}</GraphContext.Provider>;
      },
    },
  };
};
