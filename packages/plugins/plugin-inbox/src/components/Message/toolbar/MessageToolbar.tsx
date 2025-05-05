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

const createViewModeAction = (plainView: boolean, hasEnrichedContent: boolean = true) => {
  // If there's no enriched content, indicate it in the label
  const label = plainView
    ? hasEnrichedContent
      ? 'Show enriched message'
      : 'No enriched version available'
    : 'Show plain message';

  const disabled = plainView && !hasEnrichedContent;

  return createMenuAction<ViewModeActionProperties>('viewMode', {
    label,
    icon: plainView ? 'ph--article--regular' : 'ph--graph--regular',
    type: 'viewMode',
    disabled,
  });
};

export const useMessageToolbarActions = (plainView: boolean, hasEnrichedContent: boolean = true) => {
  const actionCreator = useCallback(() => {
    const nodes = [];
    const edges = [];

    const rootGroup = createMenuItemGroup('root', { label: 'Message toolbar' });
    nodes.push(rootGroup);

    const viewModeAction = createViewModeAction(plainView, hasEnrichedContent);
    nodes.push(viewModeAction);
    edges.push({ source: 'root', target: viewModeAction.id });

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
