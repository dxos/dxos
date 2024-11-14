//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { filterPlugins, type GraphProvides, type PluginDefinition, parseGraphBuilderPlugin } from '@dxos/app-framework';
import { GraphBuilder } from '@dxos/app-graph';
import { type UnsubscribeCallback } from '@dxos/async';

import { GraphContext } from './GraphContext';
import meta from './meta';

// const KEY = `${GRAPH_PLUGIN}/graph`;

/**
 * Manages the state of the graph for the application.
 * Enables other plugins to register node builders to add nodes to the graph.
 * This includes actions and annotation each other's nodes.
 */
export const GraphPlugin = (): PluginDefinition<GraphProvides> => {
  // const builder = GraphBuilder.from(localStorage.getItem(KEY) ?? undefined);
  const builder = new GraphBuilder();
  let unsubscribe: UnsubscribeCallback | undefined;

  return {
    meta,
    ready: async (plugins) => {
      filterPlugins(plugins, parseGraphBuilderPlugin).forEach((plugin) =>
        builder.addExtension(plugin.provides.graph.builder(plugins)),
      );

      await builder.initialize();

      // TODO(wittjosiah): This needs better cache invalidation before it can be enabled always.
      //   At present it's too easy to get into a state where there are partial/broken nodes in the graph.
      // unsubscribe = effect(
      //   debounce(() => {
      //     localStorage.setItem(`${GRAPH_PLUGIN}/graph`, builder.graph.pickle());
      //   }, 1000),
      // );

      // Expose the graph to the window for debugging.
      const composer = (window as any).composer;
      if (typeof composer === 'object') {
        composer.graph = builder.graph;
      }
    },
    unload: async () => {
      unsubscribe?.();
    },
    provides: {
      graph: builder.graph,
      // TODO(wittjosiah): This is janky.
      explore: (options) => builder.explore(options),
      context: ({ children }) => (
        <GraphContext.Provider value={{ graph: builder.graph }}>{children}</GraphContext.Provider>
      ),
    },
  };
};
