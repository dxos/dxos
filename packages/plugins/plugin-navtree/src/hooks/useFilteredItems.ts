//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Node, useConnections } from '@dxos/plugin-graph';
import { byPosition } from '@dxos/util';

export const filterItems = (node: Node.Node, disposition?: string) => {
  if (!disposition && (node.properties.disposition === 'hidden' || node.properties.disposition === 'alternate-tree')) {
    return false;
  } else if (!disposition) {
    const action = Node.isAction(node);
    return !action || node.properties.disposition === 'item';
  } else {
    return node.properties.disposition === disposition;
  }
};

export const useFilteredItems = (node?: Node.Node, options?: { disposition?: string; sort?: boolean }) => {
  const { graph } = useAppGraph();
  const connections = useConnections(graph, node?.id ?? Node.RootId);
  return useMemo(() => {
    const filtered = connections.filter((n) => filterItems(n, options?.disposition));
    return options?.sort ? filtered.toSorted((a, b) => byPosition(a.properties, b.properties)) : filtered;
  }, [connections, options?.disposition, options?.sort]);
};
