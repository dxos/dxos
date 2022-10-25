//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';

import {
  defaultDisabled,
  defaultFocus,
  defaultHover,
  defaultActive
} from '../../styles';
import { ButtonProps } from './ButtonProps';

export const primaryButtonColors =
  'bg-primary-600 text-white hover:bg-primary-650';
export const defaultButtonColors =
  'bg-white text-neutral-900 dark:bg-neutral-750 dark:text-neutral-50';

export const buttonStyles = (props: ButtonProps) => {
  const resolvedVariant = props.variant || 'default';
  return cx(
    'inline-flex select-none items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
    'transition-color duration-100',
    defaultHover(props),
    resolvedVariant === 'default' &&
      'border border-neutral-100 dark:border-neutral-650 hover:focus:border-neutral-100 hover:border-transparent',
    resolvedVariant === 'default' && defaultButtonColors,
    resolvedVariant === 'primary' &&
      'border border-primary-550 hover:border-transparent',
    resolvedVariant === 'primary' && primaryButtonColors,
    resolvedVariant === 'outline' &&
      'text-neutral-700 border border-neutral-600 font-medium rounded-lg text-sm text-center dark:border-neutral-300 dark:text-neutral-150',
    defaultFocus,
    props.disabled
      ? defaultDisabled
      : resolvedVariant !== 'outline' && 'button-elevation',
    // Register all radix states
    'group',
    defaultActive
  );
};
