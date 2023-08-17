//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { IntentPluginProvides } from '@braneframe/plugin-intent';
import { PluginDefinition, findPlugin } from '@dxos/react-surface';

import { GraphContext } from './GraphContext';
import { SessionGraph } from './graph';
import { GraphPluginProvides } from './types';
import { graphPlugins } from './util';

export const GraphPlugin = (): PluginDefinition<GraphPluginProvides> => {
  const graph = new SessionGraph();

  return {
    meta: {
      id: 'dxos.org/plugin/graph',
    },
    ready: async (plugins) => {
      const intentPlugin = findPlugin<IntentPluginProvides>(plugins, 'dxos.org/plugin/intent');
      graph._setSendIntent(intentPlugin?.provides.intent.sendIntent);

      graphPlugins(plugins)
        .map((plugin) => plugin.provides.graph.nodes)
        .forEach((builder) => graph.registerNodeBuilder(builder(plugins)));

      graph.construct();
    },
    provides: {
      context: ({ children }) => <GraphContext.Provider value={{ graph }}>{children}</GraphContext.Provider>,
      graph,
    },
  };
};
