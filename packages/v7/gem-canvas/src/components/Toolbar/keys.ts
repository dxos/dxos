//
// Copyright 2020 DXOS.org
//

import { D3Callable } from '../../types';

/**
 * Keyboard event handler.
 */
export const createKeyHandlers = (
): D3Callable => {
  return selection => selection
    .on('keydown', (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Enter': {
          break;
        }

        case 'Backspace': {
          break;
        }

        case 'Escape': {
          break;
        }
      }
    });
};
