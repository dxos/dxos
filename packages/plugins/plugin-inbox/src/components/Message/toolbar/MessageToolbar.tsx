//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import {
  createMenuAction,
  createMenuItemGroup,
  type MenuActionHandler,
  type MenuAction,
  useMenuActions,
} from '@dxos/react-ui-menu';

const createViewModeAction = (plainView: boolean) => {
  // We only show this action when enriched content is available
  const label = plainView ? 'Show enriched message' : 'Show plain message';

  return createMenuAction<ViewModeActionProperties>('viewMode', {
    label,
    icon: plainView ? 'ph--article--regular' : 'ph--graph--regular',
    type: 'viewMode',
  });
};

export const useMessageToolbarActions = (plainView: boolean, hasEnrichedContent: boolean = true) => {
  const actionCreator = useCallback(() => {
    const nodes = [];
    const edges = [];

    const rootGroup = createMenuItemGroup('root', { label: 'Message toolbar' });
    nodes.push(rootGroup);

    if (hasEnrichedContent) {
      const viewModeAction = createViewModeAction(plainView);
      nodes.push(viewModeAction);
      edges.push({ source: 'root', target: viewModeAction.id });
    }

    return { nodes, edges };
  }, [plainView, hasEnrichedContent]);

  return useMenuActions(actionCreator);
};

export type ViewModeActionProperties = { type: 'viewMode' };

export type MessageToolbarActionProperties = ViewModeActionProperties;

export type MessageToolbarAction = MenuAction<MessageToolbarActionProperties>;

export const useMessageToolbarAction = ({
  plainView,
  setPlainView,
}: {
  plainView: boolean;
  setPlainView: (value: boolean) => void;
}): MenuActionHandler<MessageToolbarAction> => {
  return useCallback<MenuActionHandler<MessageToolbarAction>>(
    (action: MessageToolbarAction) => {
      switch (action.properties.type) {
        case 'viewMode': {
          const newPlainView = !plainView;
          setPlainView(newPlainView);
          break;
        }
      }
    },
    [plainView, setPlainView],
  );
};
