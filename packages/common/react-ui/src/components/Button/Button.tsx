//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { forwardRef } from 'react';

export type ButtonProps = React.ComponentProps<'button'> & {
  variant?: 'default' | 'primary'
};

export const buttonClassName = (variant: ButtonProps['variant']) => cx(
  'inline-flex select-none items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
  variant === 'default' && 'shadow-md bg-white text-neutral-900 hover:bg-neutral-50 dark:bg-neutral-750 dark:text-neutral-100 dark:hover:bg-neutral-800',
  variant === 'primary' && 'shadow-md bg-primary-550 text-white hover:bg-primary-600 dark:bg-primary-100 dark:text-black dark:hover:bg-primary-200',
  'focus:outline-none focus-visible:ring focus-visible:ring-offset-1 focus-visible:ring-black focus-visible:ring-offset-white dark:focus-visible:ring-white dark:focus-visible:ring-offset-black',
  // Register all radix states
  'group',
  'radix-state-open:bg-neutral-50 dark:radix-state-open:bg-neutral-900',
  'radix-state-on:bg-neutral-50 dark:radix-state-on:bg-neutral-900',
  'radix-state-instant-open:bg-neutral-50 radix-state-delayed-open:bg-neutral-50'
);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, ...props }, ref) => (
    <button
      ref={ref}
      {...props}
      className={cx(buttonClassName(props.variant || 'default'), props.className)}
    >
      {children}
    </button>
  )
);
