//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { createMenuAction, createMenuItemGroup, useMenuActions } from '@dxos/react-ui-menu';

import { type MailboxModel } from '../model/mailbox-model';

export const useMailboxToolbarActions = (model: MailboxModel, tagFilterVisible: boolean) => {
  const actionCreator = useCallback(() => {
    const nodes = [];
    const edges = [];

    const rootGroup = createMenuItemGroup('root', { label: 'Mailbox toolbar' });
    nodes.push(rootGroup);

    const sortAction = createMenuAction('sort', {
      label: model.sortDirection === 'asc' ? 'Sort: Oldest first' : 'Sort: Newest first',
      icon: model.sortDirection === 'asc' ? 'ph--sort-ascending--regular' : 'ph--sort-descending--regular',
      type: 'sort',
    });
    nodes.push(sortAction);
    edges.push({ source: 'root', target: sortAction.id });

    const filterAction = createMenuAction('filter', {
      label: 'Filter by tags',
      icon: 'ph--tag--regular',
      type: 'filter',
      classNames: tagFilterVisible ? 'text-accentText' : undefined,
    });
    nodes.push(filterAction);
    edges.push({ source: 'root', target: filterAction.id });

    return { nodes, edges };
  }, [model, tagFilterVisible]);

  return useMenuActions(actionCreator);
};
