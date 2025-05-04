//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { createMenuAction, createMenuItemGroup, useMenuActions } from '@dxos/react-ui-menu';

const createViewModeAction = (plainView: boolean, hasEnrichedContent: boolean = true) => {
  // If there's no enriched content, indicate it in the label
  const label = plainView
    ? hasEnrichedContent
      ? 'Show enriched message'
      : 'No enriched version available'
    : 'Show plain message';

  // Disable the button if trying to view enriched but there's no enriched content
  const disabled = plainView ? !hasEnrichedContent : false;

  return createMenuAction('viewMode', {
    label,
    icon: plainView ? 'ph--text-t--regular' : 'ph--article--regular',
    type: 'viewMode',
    disabled,
  });
};

// TODO(ZaymonFC): Quite a bit of repetition in these toolbar graph creators...
export const createMessageToolbar = (plainView: boolean, hasEnrichedContent: boolean = true) => {
  const nodes = [];
  const edges = [];

  const rootGroup = createMenuItemGroup('root', { label: 'Message toolbar' });
  nodes.push(rootGroup);

  const viewModeAction = createViewModeAction(plainView, hasEnrichedContent);
  nodes.push(viewModeAction);
  edges.push({ source: 'root', target: viewModeAction.id });

  return { nodes, edges };
};

export const useMessageToolbarActions = (plainView: boolean, hasEnrichedContent: boolean = true) => {
  const toolbarCreator = useCallback(
    () => createMessageToolbar(plainView, hasEnrichedContent),
    [plainView, hasEnrichedContent],
  );
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
