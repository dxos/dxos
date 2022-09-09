//
// Copyright 2020 DXOS.org
//

import { getEventMod } from '../../controls';
import { Action, ActionType, actions } from './actions';

import { D3Callable } from '@dxos/gem-core';

const bindings = Object.values(actions).flatMap(value => value);

/**
 * Keyboard event handler.
 */
export const createKeyHandlers = (
  onAction: (action: Action) => void
): D3Callable => {
  return selection => selection
    .on('keydown', function (event: KeyboardEvent) {
      const binding = bindings.find(binding => (binding.key === event.key) && (!binding.mod || event[binding.mod]))
      if (binding) {
        if (binding.action.type === ActionType.SHOW_KEYMAP) {
          console.log(JSON.stringify(bindings, undefined, 2));
          return;
        }

        const mod = getEventMod(event);
        onAction({ ...binding.action, mod });
      }
    });
};
