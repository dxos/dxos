//
// Copyright 2023 DXOS.org
//

import { GraphNode } from '@braneframe/plugin-graph';

export const uriToActive = (uri: string) => {
  const [_, pluginShortId, nodeId, ...rest] = uri.split('/');
  return pluginShortId && nodeId ? [`${pluginShortId}/${nodeId}`, ...rest] : pluginShortId ? [pluginShortId] : [];
};

export const activeToUri = (active: string[]) => '/' + active.join('/').split('/').map(encodeURIComponent).join('/');

export const resolveNodes = (graph: GraphNode[], [id, ...path]: string[], nodes: GraphNode[] = []): GraphNode[] => {
  const node = graph.find((node) => node.id === id);
  if (!node) {
    return nodes;
  }

  const children = Object.values(node.pluginChildren ?? {}).flat() as GraphNode[];
  return resolveNodes(children, path, [...nodes, node]);
};
