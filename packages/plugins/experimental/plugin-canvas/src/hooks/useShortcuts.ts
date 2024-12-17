//
// Copyright 2024 DXOS.org
//

import { useHotkeys } from 'react-hotkeys-hook';

import { useActionHandler } from './useActionHandler';
import { useEditorContext } from './useEditorContext';

/**
 * Handle keyboard shortcuts.
 */
export const useShortcuts = (el: HTMLElement | null) => {
  const { graph, selection } = useEditorContext();
  const handleAction = useActionHandler();

  useHotkeys(
    'd',
    () =>
      handleAction({
        type: 'debug',
      }),
    { scopes: 'attention' },
  );
  useHotkeys(
    'meta+a',
    () =>
      handleAction({
        type: 'select',
        ids: [...graph.nodes.map((node) => node.id), ...graph.edges.map((edge) => edge.id)],
      }),
    { scopes: 'attention' },
  );
  useHotkeys(
    "meta+'",
    () =>
      handleAction({
        type: 'grid',
      }),
    { scopes: 'attention' },
  );
  useHotkeys(
    'Home',
    () =>
      handleAction({
        type: 'home',
      }),
    { scopes: 'attention' },
  );
  useHotkeys(
    'Backspace',
    () =>
      handleAction({
        type: 'delete',
        ids: [...selection.ids],
      }),
    { scopes: 'attention' },
  );
};
