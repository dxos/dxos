//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { createMenuAction, createMenuItemGroup, useMenuActions } from '@dxos/react-ui-menu';

const createViewModeAction = (plainView: boolean) => {
  return createMenuAction('viewMode', {
    label: plainView ? 'Show enriched message' : 'Show plain message',
    icon: plainView ? 'ph--text-t--regular' : 'ph--article--regular',
    type: 'viewMode',
  });
};

// TODO(ZaymonFC): Quite a bit of repetition in these toolbar graph creators...
export const createMessageToolbar = (plainView: boolean) => {
  const nodes = [];
  const edges = [];

  const rootGroup = createMenuItemGroup('root', { label: 'Message toolbar' });
  nodes.push(rootGroup);

  const viewModeAction = createViewModeAction(plainView);
  nodes.push(viewModeAction);
  edges.push({ source: 'root', target: viewModeAction.id });

  return { nodes, edges };
};

export const useMessageToolbarActions = (plainView: boolean) => {
  const toolbarCreator = useCallback(() => createMessageToolbar(plainView), [plainView]);
  return useMenuActions(toolbarCreator);
};

export const useMessageToolbarAction = ({
  plainView,
  setPlainView,
}: {
  plainView: boolean;
  setPlainView: (value: boolean) => void;
}) => {
  return useCallback(
    (action: { type: string }) => {
      switch (action.type) {
        case 'viewMode': {
          setPlainView(!plainView);
          break;
        }
      }
    },
    [plainView, setPlainView],
  );
};
