//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { filterPlugins, type GraphProvides, type PluginDefinition, parseGraphBuilderPlugin } from '@dxos/app-framework';
import { GraphBuilder, isActionLike } from '@dxos/app-graph';

import { GraphContext } from './GraphContext';
import meta from './meta';

/**
 * Manages the state of the graph for the application.
 * Enables other plugins to register node builders to add nodes to the graph.
 * This includes actions and annotation each other's nodes.
 */
export const GraphPlugin = (): PluginDefinition<GraphProvides> => {
  const builder = new GraphBuilder();

  return {
    meta,
    ready: async (plugins) => {
      filterPlugins(plugins, parseGraphBuilderPlugin).forEach((plugin) =>
        builder.addExtension(plugin.provides.graph.builder(plugins)),
      );

      let running = false;
      setInterval(async () => {
        if (running) {
          console.log('!!!!!!!!');
          return;
        }
        console.log('---------');
        running = true;

        await builder.explore({
          visitor: (node, path) => {
            if (isActionLike(node)) {
              return false;
            }

            console.log('VISIT', node, path);
          },
        });

        running = false;
      }, 30_000);
    },
    provides: {
      graph: builder.graph,
      context: ({ children }) => (
        <GraphContext.Provider value={{ graph: builder.graph }}>{children}</GraphContext.Provider>
      ),
    },
  };
};
