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
type NodeSerializer<T = any> = {
  type?: string;
  disposition?: 'hoist' | 'fallback';
  serialize: (node: Node<T>) => MaybePromise<SerializedNode>;
  deserialize: (id: string, data: SerializedNode) => MaybePromise<Node<T>>;
};

// TODO(wittjosiah): Factor out.
type NodeExporter<T = any> = {
  export: (params: { node: Node<T>; path: string[]; serialized: SerializedNode }) => Promise<void>;
  import: (id: string) => Promise<SerializedNode>;
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

export type GraphExporterProvides = {
  graph: {
    exporter: (plugins: Plugin[]) => NodeExporter[];
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

/**
 * Type guard for graph exporter plugins.
 */
export const parseGraphExporterPlugin = (plugin: Plugin) =>
  (plugin.provides as any).graph?.exporter ? (plugin as Plugin<GraphExporterProvides>) : undefined;
