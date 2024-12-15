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
  const { selection } = useEditorContext();

  useEffect(() => {
    if (!el) {
      return;
    }

    return bind(el, {
      type: 'keydown',
      listener: (ev: KeyboardEvent) => {
        switch (ev.key) {
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
  }, [el]);
};
