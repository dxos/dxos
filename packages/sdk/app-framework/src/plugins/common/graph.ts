//
// Copyright 2023 DXOS.org
//

import type { Graph, Node } from '@dxos/app-graph';
import type { UnsubscribeCallback } from '@dxos/async';

import type { Plugin } from '../PluginHost';

/**
 * Provides for a plugin that exposes the application graph.
 */
export type GraphPluginProvides = {
  graph: Graph;
};

export type GraphBuilderProvides = {
  graph: {
    builder: (params: { parent: Node; plugins: Plugin[] }) => UnsubscribeCallback | void;
  };
};

/**
 * Type guard for graph plugins.
 */
export const parseGraphPlugin = (plugin: Plugin) =>
  (plugin.provides as any).graph?.root ? (plugin as Plugin<GraphPluginProvides>) : undefined;

/**
 * Type guard for graph builder plugins.
 */
export const parseGraphBuilderPlugin = (plugin: Plugin) =>
  (plugin.provides as any).graph?.builder ? (plugin as Plugin<GraphBuilderProvides>) : undefined;
