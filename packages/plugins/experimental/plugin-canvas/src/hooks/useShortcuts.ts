//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';
import { useHotkeys, useHotkeysContext } from 'react-hotkeys-hook';

import { useAttention } from '@dxos/react-ui-attention';

import { useActionHandler } from './useActionHandler';
import { useEditorContext } from './useEditorContext';

/**
 * Handle keyboard shortcuts.
 */
export const useShortcuts = () => {
  const { id, graph, selection } = useEditorContext();
  const { hasAttention } = useAttention(id);
  // TODO(burdon): Consider lower-level API without react dependency (for integration with app framework).
  const { enableScope, disableScope } = useHotkeysContext();
  useEffect(() => {
    if (hasAttention) {
      enableScope(id);
    } else {
      disableScope(id);
    }
  }, [id, hasAttention]);

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
