//
// Copyright 2025 DXOS.org
//

import { type Signal } from '@preact/signals-react';
import { useCallback } from 'react';

import { createMenuAction, createMenuItemGroup, type MenuAction, useMenuActions } from '@dxos/react-ui-menu';

import { type ViewMode } from '../MessageHeader';

export const useMessageToolbarActions = (viewMode: Signal<ViewMode>) => {
  const actionCreator = useCallback(() => {
    const nodes = [];
    const edges = [];

    const rootGroup = createMenuItemGroup('root', { label: 'Message toolbar' });
    nodes.push(rootGroup);

    if (viewMode.value !== 'plain-only') {
      const isPlainView = viewMode.value === 'plain';

      const viewModeAction = createMenuAction<ViewModeActionProperties>('viewMode', {
        label: isPlainView ? 'Show enriched message' : 'Show plain message',
        icon: isPlainView ? 'ph--graph--regular' : 'ph--article--regular',
        type: 'viewMode',
      });
      nodes.push(viewModeAction);
      edges.push({ source: 'root', target: viewModeAction.id });
    }

    return { nodes, edges };
  }, [viewMode.value]);

  return useMenuActions(actionCreator);
};

export type ViewModeActionProperties = { type: 'viewMode' };

export type MessageToolbarActionProperties = ViewModeActionProperties;

export type MessageToolbarAction = MenuAction<MessageToolbarActionProperties>;
