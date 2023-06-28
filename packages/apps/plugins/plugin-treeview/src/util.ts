//
// Copyright 2023 DXOS.org
//

import { GraphNode } from '@braneframe/plugin-graph';

export const uriToSelected = (uri: string) => {
  const [_, namespace, type, id, ...rest] = uri.split('/');
  return [`${namespace}:${type}/${id}`, ...rest];
};

export const selectedToUri = (selected: string[]) => '/' + selected.join('/').replace(':', '/');

export const resolveNodes = (graph: GraphNode[], [id, ...path]: string[], nodes: GraphNode[] = []): GraphNode[] => {
  const node = graph.find((node) => node.id === id);
  if (!node) {
    return nodes;
  }

  return resolveNodes(node.children ?? [], path, [...nodes, node]);
};
