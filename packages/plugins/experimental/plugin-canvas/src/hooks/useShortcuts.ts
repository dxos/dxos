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

  const handleAction = useActionHandler();
  useHotkeys(
    'd',
    (ev) => {
      ev.preventDefault();
      void handleAction({
        type: 'debug',
      });
    },
    { scopes: [id] },
  );
  useHotkeys(
    'meta+a',
    (ev) => {
      ev.preventDefault();
      void handleAction({
        type: 'select',
        ids: [...graph.nodes.map((node) => node.id), ...graph.edges.map((edge) => edge.id)],
      });
    },
    { scopes: [id] },
  );
  useHotkeys(
    "meta+'",
    (ev) => {
      ev.preventDefault();
      void handleAction({
        type: 'grid',
      });
    },
    { scopes: [id] },
  );
  useHotkeys(
    'Home',
    (ev) => {
      ev.preventDefault();
      void handleAction({
        type: 'home',
      });
    },
    { scopes: [id] },
  );
  useHotkeys(
    'Backspace',
    (ev) => {
      ev.preventDefault();
      void handleAction({
        type: 'delete',
        ids: [...selection.ids],
      });
    },
    { scopes: [id] },
  );
};
