//
// Copyright 2020 DXOS.org
//

import { Modifiers } from '@dxos/gem-x';

import { getEventMod } from '../../elements';
import { Tool } from '../../tools';
import { D3Callable } from '../../types';

export type ActionType = 'enter' | 'delete' | 'cancel' | 'tool' | 'debug'

export type Action = {
  action: ActionType
  mod?: Modifiers
  tool?: Tool
}

const keyMap: { [ key: string ]: Tool } = {
  'r': 'rect',
  'l': 'line',
  'e': 'ellipse',
  'p': 'path'
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

        case 'd': {
          onAction({ action: 'debug' });
          break;
        }

        default: {
          const tool = keyMap[event.key];
          if (tool) {
            onAction({ action: 'tool', mod, tool });
          }
          break;
        }
      }
    });
};
