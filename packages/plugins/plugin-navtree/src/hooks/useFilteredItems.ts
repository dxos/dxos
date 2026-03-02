//
// Copyright 2025 DXOS.org
//

import { Node } from '@dxos/app-graph';

/**
 * Determines whether a node should be visible based on its disposition.
 */
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
