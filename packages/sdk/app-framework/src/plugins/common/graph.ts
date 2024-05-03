//
// Copyright 2023 DXOS.org
//

import type { Graph } from '@dxos/app-graph';
import type { UnsubscribeCallback } from '@dxos/async';

import type { Plugin } from '../PluginHost';

/**
 * Provides for a plugin that exposes the application graph.
 */
export type GraphProvides = {
  graph: Graph;
};

export type GraphBuilderProvides = {
  graph: {
    builder: (plugins: Plugin[], graph: Graph) => UnsubscribeCallback | void;
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
