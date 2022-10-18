//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';

import { ButtonProps } from '../props';
import { defaultDisabled } from './disabled';
import { defaultFocus } from './focus';

export const buttonClassName = ({ variant, disabled }: ButtonProps) => {
  const resolvedVariant = variant || 'default';
  return cx(
    'inline-flex select-none items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-all duration-200',
    resolvedVariant === 'default' && 'border border-neutral-100 bg-white text-neutral-900 hover:shadow-primary-300/50 dark:border-neutral-650 dark:bg-neutral-750 dark:text-neutral-50 dark:hover:shadow-primary-500/50',
    resolvedVariant === 'primary' && 'border border-primary-500 bg-primary-500 text-white hover:bg-primary-600',
    resolvedVariant === 'outline' && 'text-neutral-700 hover:text-white border border-neutral-700 hover:bg-neutral-800 font-medium rounded-lg text-sm text-center dark:border-neutral-200 dark:text-neutral-150 dark:hover:text-white dark:hover:bg-neutral-600/50',
    defaultFocus,
    disabled ? defaultDisabled : (resolvedVariant !== 'outline' && 'button-elevation hover:shadow-md'),
    // Register all radix states
    'group',
    'radix-state-open:bg-neutral-50 dark:radix-state-open:bg-neutral-900',
    'radix-state-on:bg-neutral-50 dark:radix-state-on:bg-neutral-900',
    'radix-state-instant-open:bg-neutral-50 radix-state-delayed-open:bg-neutral-50'
  );
};
