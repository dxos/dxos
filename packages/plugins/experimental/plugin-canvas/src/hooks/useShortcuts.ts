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
  const option = { scopes: id };
  useHotkeys(
    'd',
    (ev) => {
      ev.preventDefault();
      void handleAction({
        type: 'debug',
      });
    },
    option,
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
    option,
  );
  useHotkeys(
    "meta+'",
    (ev) => {
      ev.preventDefault();
      void handleAction({
        type: 'grid',
      });
    },
    option,
  );
  useHotkeys(
    'Home',
    (ev) => {
      ev.preventDefault();
      void handleAction({
        type: 'home',
      });
    },
    option,
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
    option,
  );
};
