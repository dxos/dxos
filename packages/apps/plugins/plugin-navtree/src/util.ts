//
// Copyright 2023 DXOS.org
//

import { type Action } from '@dxos/app-graph';
import { type TreeNode } from '@dxos/react-ui-navtree';

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

export const getPersistenceParent = (node: TreeNode, persistenceClass: string): TreeNode | null => {
  const parent = node.parent;
  if (!node || !parent) {
    return null;
  }

  if (parent.properties.acceptPersistenceClass?.has(persistenceClass)) {
    return parent;
  } else {
    return getPersistenceParent(parent, persistenceClass);
  }
};
