//
// Copyright 2025 DXOS.org
//

import { type Signal } from '@preact/signals-react';
import { useCallback } from 'react';

import { createMenuAction, createMenuItemGroup, type MenuAction, useMenuActions } from '@dxos/react-ui-menu';

import { type ViewMode } from '../MessageHeader';

/**
 * Creates a view mode toggle action based on the current view mode
 */
const createViewModeAction = (viewMode: ViewMode): MenuAction<ViewModeActionProperties> => {
  const type = 'viewMode';

  switch (viewMode) {
    case 'plain':
      return createMenuAction<ViewModeActionProperties>('viewMode', {
        label: 'Show enriched message',
        icon: 'ph--graph--regular',
        type,
      });
    case 'plain-only':
      return createMenuAction<ViewModeActionProperties>('viewMode', {
        label: 'Enriched message not available',
        icon: 'ph--graph--regular',
        type,
        disabled: true,
      });
    default: // enriched or any other mode
      return createMenuAction<ViewModeActionProperties>('viewMode', {
        label: 'Show plain message',
        icon: 'ph--article--regular',
        type,
      });
  }
};

export const useMessageToolbarActions = (viewMode: Signal<ViewMode>) => {
  const actionCreator = useCallback(() => {
    const nodes = [];
    const edges = [];

    const rootGroup = createMenuItemGroup('root', { label: 'Message toolbar' });
    nodes.push(rootGroup);

    // Create action based on viewMode
    const viewModeAction = createViewModeAction(viewMode.value);

    nodes.push(viewModeAction);
    edges.push({ source: 'root', target: viewModeAction.id });

    return { nodes, edges };
  }, [viewMode.value]);

  return useMenuActions(actionCreator);
};

export type ViewModeActionProperties = { type: 'viewMode' };

export type MessageToolbarActionProperties = ViewModeActionProperties;

export type MessageToolbarAction = MenuAction<MessageToolbarActionProperties>;
