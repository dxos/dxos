//
// Copyright 2023 DXOS.org
//

import type { Action, Node } from '@dxos/app-graph';
import type { TFunction } from '@dxos/react-ui';

export const getLevel = (node: Node, level = 0): number => {
  if (!node.parent) {
    return level;
  } else {
    return getLevel(node.parent, level + 1);
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

// TODO(wittjosiah): Why fallbackTitle?
export const getTreeItemLabel = (node: Node, t: TFunction) =>
  Array.isArray(node.label) ? t(...node.label) : node.label;

export const getPersistenceParent = (node: Node, persistenceClass: string): Node | null => {
  if (!node || !node.parent) {
    return null;
  }

  if (node.parent.properties.acceptPersistenceClass?.has(persistenceClass)) {
    return node.parent;
  } else {
    return getPersistenceParent(node.parent, persistenceClass);
  }
};
