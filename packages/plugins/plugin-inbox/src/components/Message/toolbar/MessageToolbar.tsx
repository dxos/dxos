//
// Copyright 2025 DXOS.org
//

import { type Signal } from '@preact/signals-react';

import { createMenuAction, createMenuItemGroup, type MenuAction, useMenuActions } from '@dxos/react-ui-menu';

import { INBOX_PLUGIN } from '../../../meta';
import { type ViewMode } from '../MessageHeader';

/**
 * Creates a view mode toggle action based on the current view mode
 */
const createViewModeAction = (viewMode: ViewMode): MenuAction<ViewModeActionProperties> => {
  const type = 'viewMode';

  switch (viewMode) {
    case 'plain':
      return createMenuAction<ViewModeActionProperties>('viewMode', {
        label: ['mailbox toolbar show enriched message', { ns: INBOX_PLUGIN }],
        icon: 'ph--graph--regular',
        type,
      });
    case 'plain-only':
      return createMenuAction<ViewModeActionProperties>('viewMode', {
        label: ['mailbox toolbar enriched message not available', { ns: INBOX_PLUGIN }],
        icon: 'ph--graph--regular',
        type,
        disabled: true,
      });
    default: // enriched or any other mode
      return createMenuAction<ViewModeActionProperties>('viewMode', {
        label: ['mailbox toolbar show plain message', { ns: INBOX_PLUGIN }],
        icon: 'ph--article--regular',
        type,
      });
  }
};

// TODO(ZaymonFC): Collapse state to single object.
export const useMessageToolbarActions = (viewMode: Signal<ViewMode>, existingContact: Signal<any | undefined>) => {
  return useMenuActions(() => {
    const nodes = [];
    const edges = [];

    const rootGroup = createMenuItemGroup('root', {
      label: ['mailbox toolbar label', { ns: INBOX_PLUGIN }],
    });
    nodes.push(rootGroup);

    // Create action based on viewMode
    const viewModeAction = createViewModeAction(viewMode.value);

    nodes.push(viewModeAction);
    edges.push({ source: 'root', target: viewModeAction.id });

    const extractContactAction = createMenuAction<ExtractContactActionProperties>('extractContact', {
      label: ['Extract contact', { ns: INBOX_PLUGIN }],
      icon: 'ph--user-plus--regular',
      type: 'extractContact',
    });

    nodes.push(extractContactAction);
    edges.push({ source: 'root', target: extractContactAction.id });

    return { nodes, edges };
  });
};

export type ViewModeActionProperties = { type: 'viewMode' };

export type ExtractContactActionProperties = { type: 'extractContact' };

export type MessageToolbarActionProperties = ViewModeActionProperties | ExtractContactActionProperties;

export type MessageToolbarAction = MenuAction<MessageToolbarActionProperties>;
