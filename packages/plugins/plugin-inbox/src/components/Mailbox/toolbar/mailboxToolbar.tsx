//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { createMenuAction, createMenuItemGroup, useMenuActions } from '@dxos/react-ui-menu';

import { type MailboxToolbarState } from './useMailboxToolbarAction';
import { type MailboxModel, type SortDirection } from '../model/mailbox-model';

// Action creators
const createSortAction = (direction: SortDirection) => {
  return createMenuAction('sort', {
    label: direction === 'asc' ? 'Sort: Oldest first' : 'Sort: Newest first',
    icon: direction === 'asc' ? 'ph--sort-ascending--regular' : 'ph--sort-descending--regular',
    type: 'sort',
  });
};

const createFilterAction = (visible: boolean) => {
  return createMenuAction('filter', {
    label: 'Filter by tags',
    icon: 'ph--tag--regular',
    type: 'filter',
    visible,
  });
};

export const createMailboxToolbar = (model: MailboxModel, state: MailboxToolbarState) => {
  const nodes = [];
  const edges = [];

  const rootGroup = createMenuItemGroup('root', { label: 'Mailbox toolbar' });
  nodes.push(rootGroup);

  const sortAction = createSortAction(model.sortDirection);
  nodes.push(sortAction);
  edges.push({ source: 'root', target: sortAction.id });

  const filterAction = createFilterAction(state.filterVisible);
  nodes.push(filterAction);
  edges.push({ source: 'root', target: filterAction.id });

  return { nodes, edges };
};

export const useMailboxToolbarActions = (model: MailboxModel, state: MailboxToolbarState) => {
  const toolbarCreator = useCallback(() => createMailboxToolbar(model, state), [model, state]);
  return useMenuActions(toolbarCreator);
};
