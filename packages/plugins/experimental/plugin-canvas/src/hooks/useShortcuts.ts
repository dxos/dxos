//
// Copyright 2024 DXOS.org
//

import { useHotkeys } from 'react-hotkeys-hook';

import { useActionHandler } from './useActionHandler';
import { useEditorContext } from './useEditorContext';

const options = { scopes: 'plugin-canvas' };

/**
 * Handle keyboard shortcuts.
 */
export const useShortcuts = () => {
  const { graph, selection } = useEditorContext();
  const handleAction = useActionHandler();

  useHotkeys(
    'd',
    () =>
      handleAction({
        type: 'debug',
      }),
    options,
  );
  useHotkeys(
    'meta+a',
    () =>
      handleAction({
        type: 'select',
        ids: [...graph.nodes.map((node) => node.id), ...graph.edges.map((edge) => edge.id)],
      }),
    options,
  );
  useHotkeys(
    "meta+'",
    () =>
      handleAction({
        type: 'grid',
      }),
    options,
  );
  useHotkeys(
    'Home',
    () =>
      handleAction({
        type: 'home',
      }),
    options,
  );
  useHotkeys(
    'Backspace',
    () =>
      handleAction({
        type: 'delete',
        ids: [...selection.ids],
      }),
    options,
  );
};
