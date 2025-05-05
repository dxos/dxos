//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { createMenuAction, createMenuItemGroup, useMenuActions } from '@dxos/react-ui-menu';

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
    classNames: visible ? 'text-accentText' : undefined,
  });
};

export const createMailboxToolbar = (model: MailboxModel, tagFilterVisible: boolean) => {
  const nodes = [];
  const edges = [];

  const rootGroup = createMenuItemGroup('root', { label: 'Mailbox toolbar' });
  nodes.push(rootGroup);

  const sortAction = createSortAction(model.sortDirection);
  nodes.push(sortAction);
  edges.push({ source: 'root', target: sortAction.id });

  const filterAction = createFilterAction(tagFilterVisible);
  nodes.push(filterAction);
  edges.push({ source: 'root', target: filterAction.id });

  return { nodes, edges };
};

export const useMailboxToolbarActions = (model: MailboxModel, tagFilterVisible: boolean) => {
  const toolbarCreator = useCallback(() => createMailboxToolbar(model, tagFilterVisible), [model, tagFilterVisible]);
  // TODO(ZaymonFC): Ask @Thure how to get menu to re-render when action creator changes.
  //   OR: How to bind nodes to state? Filter button isn't toggling color.
  return useMenuActions(toolbarCreator);
};
