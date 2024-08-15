//
// Copyright 2023 DXOS.org
//

import type { Graph, GraphBuilder, Node } from '@dxos/app-graph';
import { type MaybePromise } from '@dxos/util';

import type { Plugin } from '../PluginHost';

// TODO(wittjosiah): Factor out.
export type SerializedNode = {
  name: string;
  data: string;
  type?: string;
};

// TODO(wittjosiah): Factor out.
export type NodeSerializer<T = any> = {
  inputType: string;
  outputType: string;
  disposition?: 'hoist' | 'fallback';

  /**
   * Takes a node and serializes it into a format that can be stored.
   */
  serialize: (node: Node<T>) => MaybePromise<SerializedNode>;

  /**
   * Takes a serialized node and deserializes it into the application.
   */
  deserialize: (data: SerializedNode, ancestors: unknown[]) => MaybePromise<T>;
};

/**
 * Provides for a plugin that exposes the application graph.
 */
export type GraphProvides = {
  graph: Graph;
  explore: GraphBuilder['explore'];
};

export type GraphBuilderProvides = {
  graph: {
    builder: (plugins: Plugin[]) => Parameters<GraphBuilder['addExtension']>[0];
  };
};

export type GraphSerializerProvides = {
  graph: {
    serializer: (plugins: Plugin[]) => NodeSerializer[];
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

/**
 * Type guard for graph serializer plugins.
 */
export const parseGraphSerializerPlugin = (plugin: Plugin) =>
  (plugin.provides as any).graph?.serializer ? (plugin as Plugin<GraphSerializerProvides>) : undefined;
