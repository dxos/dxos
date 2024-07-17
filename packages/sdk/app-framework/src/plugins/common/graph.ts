//
// Copyright 2023 DXOS.org
//

import type { Graph, GraphBuilder } from '@dxos/app-graph';

import type { Plugin } from '../PluginHost';

/**
 * Provides for a plugin that exposes the application graph.
 */
export type GraphProvides = {
  graph: Graph;
};

export type GraphBuilderProvides = {
  graph: {
    builder: (plugins: Plugin[]) => Parameters<GraphBuilder['addExtension']>[0];
  };
};

/**
 * Type guard for graph plugins.
 */
export const parseGraphPlugin = (plugin: Plugin) =>
  (plugin.provides as any).graph?.root ? (plugin as Plugin<GraphProvides>) : undefined;

/**
 * Type guard for graph builder plugins.
 */
export const parseGraphBuilderPlugin = (plugin: Plugin) =>
  (plugin.provides as any).graph?.builder ? (plugin as Plugin<GraphBuilderProvides>) : undefined;
