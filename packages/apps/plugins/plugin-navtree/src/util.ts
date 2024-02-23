//
// Copyright 2023 DXOS.org
//

import { type Action, type Node } from '@dxos/app-graph';
import type { TFunction } from '@dxos/react-ui';
import { type TreeNode } from '@dxos/react-ui-navtree';

export const getLevel = (node: Node, level = 0): number => {
  const parent = node.nodes({ direction: 'inbound' })[0];
  if (!parent) {
    return level;
  } else {
    return getLevel(parent, level + 1);
  }
};

// TODO(wittjosiah): Move into node implementation?
export const sortActions = (actions: Action[]): Action[] =>
  actions.sort((a, b) => {
    if (a.properties.disposition === b.properties.disposition) {
      return 0;
    }

    if (a.properties.disposition === 'toolbar') {
      return -1;
    }

    return 1;
  });

export const getTreeItemLabel = (node: TreeNode, t: TFunction) =>
  Array.isArray(node.label) ? t(...node.label) : node.label;

export const getPersistenceParent = (node: Node, persistenceClass: string): Node | null => {
  const parent = node.nodes({ direction: 'inbound' })[0];
  if (!node || !parent) {
    return null;
  }

  if (parent.properties.acceptPersistenceClass?.has(persistenceClass)) {
    return parent;
  } else {
    return getPersistenceParent(parent, persistenceClass);
  }
};
