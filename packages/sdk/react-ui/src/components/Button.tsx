//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { forwardRef } from 'react';

type Props = Omit<React.ComponentProps<'button'>, 'className'> & {};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ children, ...props }, ref) => (
    <button
      ref={ref}
      {...props}
      className={cx(
        'inline-flex select-none items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
        'shadow-md bg-white text-neutral-700 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-900',
        'hover:bg-neutral-50',
        'focus:outline-none focus-visible:ring focus-visible:ring-primary-500 focus-visible:ring-opacity-75',
        // Register all radix states
        'group',
        'radix-state-open:bg-neutral-50 dark:radix-state-open:bg-neutral-900',
        'radix-state-on:bg-neutral-50 dark:radix-state-on:bg-neutral-900',
        'radix-state-instant-open:bg-neutral-50 radix-state-delayed-open:bg-neutral-50'
      )}
    >
      {children}
    </button>
  )
);
