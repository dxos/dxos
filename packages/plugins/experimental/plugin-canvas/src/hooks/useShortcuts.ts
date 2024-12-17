//
// Copyright 2024 DXOS.org
//

import { bind } from 'bind-event-listener';
import { useEffect } from 'react';

import { useActionHandler } from './useActionHandler';
import { useEditorContext } from './useEditorContext';

/**
 * Handle keyboard shortcuts.
 */
export const useShortcuts = (el: HTMLElement | null) => {
  const handleAction = useActionHandler();
  const { graph, selection, editing } = useEditorContext();

  useEffect(() => {
    if (!el || editing) {
      return;
    }

    return bind(el, {
      type: 'keydown',
      listener: (ev: KeyboardEvent) => {
        // TODO(burdon): Util for keys.
        // TODO(burdon): Make all shortcuts actions.
        switch (ev.key) {
          case 'a': {
            if (ev.metaKey) {
              selection.setSelected([...graph.nodes.map((node) => node.id), ...graph.edges.map((edge) => edge.id)]);
            }
            break;
          }

          case 'd': {
            handleAction({
              type: 'debug',
            });
            break;
          }

          case "'": {
            if (ev.metaKey) {
              handleAction({
                type: 'grid',
              });
            }
            break;
          }

          case 'Backspace': {
            handleAction({
              type: 'delete',
              ids: selection.ids,
            });
            break;
          }
        }
      },
    });
  }, [el, graph, selection, editing]);
};
