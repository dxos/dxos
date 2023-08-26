//
// Copyright 2023 DXOS.org
//

import { Graph } from '@braneframe/plugin-graph';
import type { TFunction } from '@dxos/aurora';

export const uriToActive = (uri: string) => {
  const [_, ...nodeId] = uri.split('/');
  return nodeId ? nodeId.join(':') : undefined;
};

export const activeToUri = (active?: string) =>
  '/' + (active ? active.split(':').map(encodeURIComponent).join('/') : '');

// TODO(wittjosiah): Move into node implementation?
export const sortActions = (actions: Graph.Action[]): Graph.Action[] =>
  actions.sort((a, b) => {
    if (a.properties.disposition === b.properties.disposition) {
      return 0;
    }

    if (a.properties.disposition === 'toolbar') {
      return -1;
    }

    return 1;
  });

// NOTE: This is the same as @tldraw/indices implementation but working on Graph.Node properties.
export const sortByIndex = (a: Graph.Node, b: Graph.Node) => {
  if (a.properties.index < b.properties.index) {
    return -1;
  } else if (a.properties.index > b.properties.index) {
    return 1;
  }
  return 0;
};

export const getTreeItemLabel = (node: Graph.Node, t: TFunction) =>
  node.properties?.preferFallbackTitle
    ? Array.isArray(node.properties.fallbackTitle)
      ? t(...(node.properties.fallbackTitle as [string, { ns: string }]))
      : node.properties.fallbackTitle
    : Array.isArray(node.label)
    ? t(...node.label)
    : node.label;
