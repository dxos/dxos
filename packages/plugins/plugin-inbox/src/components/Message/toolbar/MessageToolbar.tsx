//
// Copyright 2025 DXOS.org
//

import { type Signal } from '@preact/signals-react';
import { useCallback } from 'react';

import { createMenuAction, createMenuItemGroup, type MenuAction, useMenuActions } from '@dxos/react-ui-menu';

import { type ViewMode } from '../MessageHeader';

const createViewModeAction = (isPlainView: boolean) => {
  // We only show this action when enriched content is available
  const label = isPlainView ? 'Show enriched message' : 'Show plain message';

  return createMenuAction<ViewModeActionProperties>('viewMode', {
    label,
    icon: isPlainView ? 'ph--article--regular' : 'ph--graph--regular',
    type: 'viewMode',
  });
};

export const useMessageToolbarActions = (viewMode: Signal<ViewMode>, hasEnrichedContent: boolean) => {
  const actionCreator = useCallback(() => {
    const nodes = [];
    const edges = [];

    const rootGroup = createMenuItemGroup('root', { label: 'Message toolbar' });
    nodes.push(rootGroup);

    if (hasEnrichedContent) {
      const isPlainView = viewMode.value === 'plain' || viewMode.value === 'plain-only';
      const viewModeAction = createViewModeAction(isPlainView);
      nodes.push(viewModeAction);
      edges.push({ source: 'root', target: viewModeAction.id });
    }

    return { nodes, edges };
  }, [viewMode.value, hasEnrichedContent]);

  return useMenuActions(actionCreator);
};

export type ViewModeActionProperties = { type: 'viewMode' };

export type MessageToolbarActionProperties = ViewModeActionProperties;

export type MessageToolbarAction = MenuAction<MessageToolbarActionProperties>;
