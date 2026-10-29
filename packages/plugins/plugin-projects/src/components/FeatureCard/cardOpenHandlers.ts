//
// Copyright 2026 DXOS.org
//

import { type MouseEvent } from 'react';

import { isControl } from './fields.tsx';

/**
 * Click handlers for a host's item that holds a card: Cmd/Ctrl-click and double-click open it, while a plain click is
 * left to the item (focus, selection). The open is caught in the capture phase, so the item's own click never sees it.
 */
export const cardOpenHandlers = (open: (() => void) | undefined, { disabled }: { disabled?: boolean } = {}) =>
  open && !disabled
    ? {
        onClickCapture: (event: MouseEvent) => {
          // A control's own Cmd-click (the menu, an edit button) stays the control's.
          if ((event.metaKey || event.ctrlKey) && !isControl(event.target)) {
            event.stopPropagation();
            open();
          }
        },
        onDoubleClick: (event: MouseEvent) => {
          if (!isControl(event.target)) {
            open();
          }
        },
      }
    : {};
