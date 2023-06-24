//
// Copyright 2023 DXOS.org
//

import { IconProps } from '@phosphor-icons/react';
import React, { UIEvent, FC, createContext, useContext } from 'react';

import type { TFunction } from '@dxos/aurora';

import { definePlugin, Plugin } from '../framework';

export type MaybePromise<T> = T | Promise<T>;

export type GraphNode<TDatum = any> = {
  id: string;
  label: string | [string, { ns: string; count?: number }];
  description?: string;
  icon?: FC;
  data?: TDatum; // nit about naming this
  parent?: GraphNode;
  children?: GraphNode[];
  actions?: GraphNodeAction[];
  attributes?: { [key: string]: any };
};

export type GraphNodeAction = {
  id: string;
  testId?: string;
  // todo(thure): `Parameters<TFunction>` causes typechecking issues because `TFunction` has so many signatures
  label: string | [string, { ns: string; count?: number }];
  icon?: FC<IconProps>;
  invoke: (t: TFunction, event: UIEvent) => MaybePromise<void>;
};

export type GraphProvides = {
  graph: {
    nodes?: (plugins: Plugin[]) => GraphNode[];
    actions?: (plugins: Plugin[]) => GraphNodeAction[];
  };
};

type GraphPlugin = Plugin<GraphProvides>;

export const findGraphNode = (nodes: GraphNode[], [id, ...path]: string[]): GraphNode | undefined => {
  const node = nodes.find((n) => n.id === id);
  if (!node) {
    return undefined;
  }

  if (path.length === 0 || !node.children || node.children.length === 0) {
    return node;
  }

  return findGraphNode(node.children, path);
};

export const isGraphNode = (datum: unknown): datum is GraphNode =>
  datum && typeof datum === 'object' ? 'id' in datum && 'label' in datum : false;

export const graphPlugins = (plugins: Plugin[]): GraphPlugin[] => {
  return (plugins as GraphPlugin[]).filter((p) => typeof p.provides?.graph?.nodes === 'function');
};

// TODO(wittjosiah): State can be a GraphNode.
export type GraphContextValue = {
  roots: { [key: string]: GraphNode[] };
  actions: { [key: string]: GraphNodeAction[] };
};

const graph: GraphContextValue = {
  roots: {},
  actions: {},
};

const GraphContext = createContext<GraphContextValue>(graph);

export const useGraphContext = () => useContext(GraphContext);

export type GraphPluginProvides = {
  graph: GraphContextValue;
};

export const GraphPlugin = definePlugin<GraphPluginProvides, {}>({
  meta: {
    id: 'dxos:GraphPlugin',
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
});
