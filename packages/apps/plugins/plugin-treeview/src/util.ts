//
// Copyright 2023 DXOS.org
//

import { GraphNode } from '@braneframe/plugin-graph';

export const uriToSelected = (uri: string) => {
  const [_, namespace, type, id, ...rest] = uri.split('/');
  return namespace && type && id ? [`${namespace}:${type}/${id}`, ...rest] : [];
};

export const selectedToUri = (selected: string[]) => '/' + selected.join('/').replace(':', '/');

export const resolveNodes = (graph: GraphNode[], [id, ...path]: string[], nodes: GraphNode[] = []): GraphNode[] => {
  const node = graph.find((node) => node.id === id);
  if (!node) {
    return nodes;
  }

  const children = Object.values(node.pluginChildren ?? {}).flat() as GraphNode[];
  return resolveNodes(children, path, [...nodes, node]);
};
