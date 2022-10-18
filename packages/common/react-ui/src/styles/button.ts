//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';

import { ButtonProps } from '../props';
import { defaultDisabled } from './disabled';
import { defaultFocus } from './focus';
import { defaultHover } from './hover';

export const buttonClassName = (props: ButtonProps) => {
  const resolvedVariant = props.variant || 'default';
  return cx(
    'inline-flex select-none items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
    defaultHover(props),
    resolvedVariant === 'default' && 'border border-neutral-100 hover:border-transparent bg-white text-neutral-900 dark:border-neutral-650 dark:bg-neutral-750 dark:text-neutral-50',
    resolvedVariant === 'primary' && 'border border-primary-500 hover:border-transparent bg-primary-500 text-white hover:bg-primary-550',
    resolvedVariant === 'outline' && 'text-neutral-700 border border-neutral-600 font-medium rounded-lg text-sm text-center dark:border-neutral-300 dark:text-neutral-150',
    defaultFocus,
    props.disabled ? defaultDisabled : (resolvedVariant !== 'outline' && 'button-elevation'),
    // Register all radix states
    'group',
    'radix-state-open:bg-neutral-50 dark:radix-state-open:bg-neutral-900',
    'radix-state-on:bg-neutral-50 dark:radix-state-on:bg-neutral-900',
    'radix-state-instant-open:bg-neutral-50 radix-state-delayed-open:bg-neutral-50'
  );
};
