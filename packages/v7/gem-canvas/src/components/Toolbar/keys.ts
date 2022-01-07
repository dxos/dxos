//
// Copyright 2020 DXOS.org
//

/**
 * Keyboard event handler.
 */
export const createKeyHandlers = (
) => {
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
