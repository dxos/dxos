//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/react-surface';

import { GraphNode, GraphProvides } from './types';

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

type GraphPlugin = Plugin<GraphProvides>;
export const graphPlugins = (plugins: Plugin[]): GraphPlugin[] => {
  return (plugins as GraphPlugin[]).filter((p) => typeof p.provides?.graph?.nodes === 'function');
};
