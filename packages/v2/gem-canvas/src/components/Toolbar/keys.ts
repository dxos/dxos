//
// Copyright 2020 DXOS.org
//

import { getEventMod } from '../../controls';
import { Tool } from '../../tools';
import { D3Callable } from '../../types';

import { Modifiers } from '@dxos/gem-core';

export enum ActionType {
  ENTER,
  DELETE,
  CANCEL,
  TOOL_SELECT,
  DEBUG,
  RESET,
  CUT,
  TOGGLE_GRID,
  SHOW_KEYMAP
}

export type Action = {
  action: ActionType
  mod?: Modifiers
  tool?: Tool
}

const keyMap: { key: string, mod?: string, action: Action }[] = [
  {
    key: 'r',
    action: { action: ActionType.TOOL_SELECT, tool: 'rect' }
  },
  {
    key: 'l',
    action: { action: ActionType.TOOL_SELECT, tool: 'line' }
  },
  {
    key: 'e',
    action: { action: ActionType.TOOL_SELECT, tool: 'ellipse' }
  },
  {
    key: 'p',
    action: { action: ActionType.TOOL_SELECT, tool: 'path' }
  },
  {
    key: 'g',
    action: { action: ActionType.TOGGLE_GRID }
  },
  {
    key: 'Enter',
    action: { action: ActionType.ENTER }
  },
  {
    key: 'Escape',
    action: { action: ActionType.CANCEL }
  },
  {
    key: 'Backspace',
    action: { action: ActionType.DELETE }
  },
  {
    key: '\\',
    mod: 'ctrlKey',
    action: { action: ActionType.RESET }
  },
  {
    key: 'x',
    mod: 'metaKey',
    action: { action: ActionType.CUT }
  },
  {
    key: 'd',
    mod: 'ctrlKey',
    action: { action: ActionType.DEBUG }
  },
  {
    key: '?',
    action: { action: ActionType.SHOW_KEYMAP }
  },
];

/**
 * Keyboard event handler.
 */
export const createKeyHandlers = (
  onAction: (action: Action) => void
): D3Callable => {
  return selection => selection
    .on('keydown', (event: KeyboardEvent) => {
      const mod = getEventMod(event);
      const binding = keyMap.find(binding => (binding.key === event.key) && (!binding.mod || event[binding.mod]))
      if (binding) {
        if (binding.action.action === ActionType.SHOW_KEYMAP) {
          console.log(JSON.stringify(keyMap, undefined, 2));
          return;
        }

        onAction({ ...binding.action, mod });
      }
    });
};
