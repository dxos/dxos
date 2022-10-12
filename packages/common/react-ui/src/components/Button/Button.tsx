//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { forwardRef } from 'react';

import { defaultFocus } from '../../styles';

export type ButtonProps = React.ComponentProps<'button'> & {
  variant?: 'default' | 'primary'
};

export const buttonClassName = (variant: ButtonProps['variant']) => cx(
  'inline-flex select-none items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
  variant === 'default' && 'shadow-md border border-neutral-100 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-neutral-650 dark:bg-neutral-750 dark:text-neutral-100 dark:hover:bg-neutral-800',
  variant === 'primary' && 'shadow-md border border-primary-700 bg-primary-600 text-white hover:bg-primary-650',
  defaultFocus,
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
