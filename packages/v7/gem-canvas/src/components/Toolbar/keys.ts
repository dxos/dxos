//
// Copyright 2020 DXOS.org
//

import { Modifiers } from '@dxos/gem-x';

import { getEventMod } from '../../elements';
import { D3Callable } from '../../types';

export type ActionType = 'enter' | 'delete' | 'cancel'

export type Action = {
  action: ActionType,
  mod: Modifiers
}

/**
 * Keyboard event handler.
 */
export const createKeyHandlers = (
  onAction: (action: Action) => void
): D3Callable => {
  return selection => selection
    .on('keydown', (event: KeyboardEvent) => {
      const mod = getEventMod(event);
      switch (event.key) {
        case 'Enter': {
          onAction({ action: 'enter', mod });
          break;
        }

        case 'Backspace': {
          onAction({ action: 'delete', mod });
          break;
        }

        case 'Escape': {
          onAction({ action: 'cancel', mod });
          break;
        }
      }
    });
};
