//
// Copyright 2025 DXOS.org
//

import { type Signal } from '@preact/signals-core';

import { createMenuAction, createMenuItemGroup, useMenuActions } from '@dxos/react-ui-menu';

import { INBOX_PLUGIN } from '../../../meta';
import { type MailboxModel } from '../model/mailbox-model';

export const useMailboxToolbarActions = (
  model: MailboxModel,
  tagFilterVisible: Signal<boolean>,
  setTagFilterVisible: (visible: boolean) => void,
) => {
  return useMenuActions(() => {
    const nodes = [];
    const edges = [];

    const rootGroup = createMenuItemGroup('root', {
      label: ['mailbox toolbar title', { ns: INBOX_PLUGIN }],
    });
    nodes.push(rootGroup);

    const sortAction = createMenuAction(
      'sort',
      () => {
        const newDirection = model.sortDirection === 'asc' ? 'desc' : 'asc';
        model.sortDirection = newDirection;
      },
      {
        label:
          model.sortDirection === 'asc'
            ? ['mailbox toolbar sort oldest', { ns: INBOX_PLUGIN }]
            : ['mailbox toolbar sort newest', { ns: INBOX_PLUGIN }],
        icon: model.sortDirection === 'asc' ? 'ph--sort-ascending--regular' : 'ph--sort-descending--regular',
        type: 'sort',
      },
    );
    nodes.push(sortAction);
    edges.push({ source: 'root', target: sortAction.id });

    const filterAction = createMenuAction(
      'filter',
      () => {
        const newVisibility = !tagFilterVisible.value;
        setTagFilterVisible(newVisibility);
      },
      {
        label: ['mailbox toolbar filter by tags', { ns: INBOX_PLUGIN }],
        icon: 'ph--tag--regular',
        type: 'filter',
        classNames: tagFilterVisible.value ? 'text-accentText' : undefined,
      },
    );
    nodes.push(filterAction);
    edges.push({ source: 'root', target: filterAction.id });

    return { nodes, edges };
  });
};
