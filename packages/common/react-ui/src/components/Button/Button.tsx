//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { forwardRef } from 'react';

import { defaultDisabled, defaultFocus } from '../../styles';

export interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: 'default' | 'primary' | 'outline'
  disabled?: boolean
}

export const buttonClassName = ({ variant, disabled }: ButtonProps) => {
  const resolvedVariant = variant || 'default';
  return cx(
    'inline-flex select-none items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors duration-100',
    resolvedVariant === 'default' && 'border border-neutral-100 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-neutral-650 dark:bg-neutral-750 dark:text-neutral-100 dark:hover:bg-neutral-800',
    resolvedVariant === 'primary' && 'bg-primary-500 text-white hover:bg-primary-600',
    resolvedVariant === 'outline' && 'text-neutral-700 hover:text-white border border-neutral-700 hover:bg-neutral-800 font-medium rounded-lg text-sm text-center dark:border-neutral-500 dark:text-neutral-500 dark:hover:text-white dark:hover:bg-neutral-600',
    defaultFocus,
    disabled ? defaultDisabled : (resolvedVariant !== 'outline' && 'shadow-md'),
    // Register all radix states
    'group',
    'radix-state-open:bg-neutral-50 dark:radix-state-open:bg-neutral-900',
    'radix-state-on:bg-neutral-50 dark:radix-state-on:bg-neutral-900',
    'radix-state-instant-open:bg-neutral-50 radix-state-delayed-open:bg-neutral-50'
  );
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, ...props }, ref) => (
    <button
      ref={ref}
      {...props}
      className={cx(buttonClassName(props), props.className)}
      {...(props.disabled && { disabled: true })}
    >
      {children}
    </button>
  )
);
