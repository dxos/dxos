//
// Copyright 2026 DXOS.org
//

import { type KeyboardEvent, type MouseEvent } from 'react';

/**
 * Props that make a non-button element (a Card, a Card row, an Image frame) a button when it has an `onClick`:
 * focusable and activated by Enter and Space, but only when it is itself the target, so a nested control's keys stay
 * its own. Without `onClick` only the caller's `onKeyDown` passes through.
 */
export const clickableProps = <T extends HTMLElement>(
  onClick: ((event: MouseEvent<T>) => void) | undefined,
  onKeyDown: ((event: KeyboardEvent<T>) => void) | undefined,
) =>
  onClick
    ? {
        role: 'button',
        tabIndex: 0,
        onClick,
        onKeyDown: (event: KeyboardEvent<T>) => {
          onKeyDown?.(event);
          if (!event.defaultPrevented && event.target === event.currentTarget && [' ', 'Enter'].includes(event.key)) {
            event.preventDefault();
            event.currentTarget.click();
          }
        },
      }
    : { onKeyDown };
