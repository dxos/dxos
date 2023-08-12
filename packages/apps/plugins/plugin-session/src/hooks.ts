//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { SessionContext } from './SessionContext';
import { NodeKey, RelationKey, SessionNode } from './types';

export const useResolvedData = (id: NodeKey) => {
  const { dataResolvers, sessionGraph } = useContext(SessionContext);
  const node = sessionGraph.nodes[id];
  if (!node) {
    return undefined;
  } else {
    for (const resolver of dataResolvers) {
      const result = resolver(node as SessionNode);
      if (result) {
        return result;
      }
    }
    return undefined;
  }
};

export const useRelatedNodes = (id: NodeKey, relationAs: RelationKey): Record<NodeKey, SessionNode> => {
  const {
    sessionGraph: { nodes, relations },
  } = useContext(SessionContext);
  return Array.from(relations[id]?.[relationAs]).reduce((acc: Record<NodeKey, SessionNode>, nodeKey) => {
    const node = nodes[nodeKey];
    if (node) {
      acc[nodeKey] = node as SessionNode;
    }
    return acc;
  }, {});
};
