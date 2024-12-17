//
// Copyright 2024 DXOS.org
//

import { useHotkeys } from 'react-hotkeys-hook';

import { useActionHandler } from './useActionHandler';
import { useEditorContext } from './useEditorContext';

/**
 * Handle keyboard shortcuts.
 */
export const useShortcuts = () => {
  const { id, graph, selection } = useEditorContext();
  const option = { scopes: id };
  const handleAction = useActionHandler();

  useHotkeys(
    'd',
    () =>
      handleAction({
        type: 'debug',
      }),
    option,
  );
  useHotkeys(
    'meta+a',
    () =>
      handleAction({
        type: 'select',
        ids: [...graph.nodes.map((node) => node.id), ...graph.edges.map((edge) => edge.id)],
      }),
    option,
  );
  useHotkeys(
    "meta+'",
    () =>
      handleAction({
        type: 'grid',
      }),
    option,
  );
  useHotkeys(
    'Home',
    () =>
      handleAction({
        type: 'home',
      }),
    option,
  );
  useHotkeys(
    'Backspace',
    () =>
      handleAction({
        type: 'delete',
        ids: [...selection.ids],
      }),
    option,
  );
};
