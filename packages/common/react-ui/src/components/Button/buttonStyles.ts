//
// Copyright 2022 DXOS.org
//

import { defaultDisabled, defaultFocus, defaultHover, defaultActive } from '../../styles';
import { mx } from '../../util';
import { ButtonProps } from './ButtonProps';

export const primaryButtonColors = 'bg-primary-600 text-white hover:bg-primary-650';
export const defaultButtonColors = 'bg-white text-neutral-900 dark:bg-neutral-750 dark:text-neutral-50';
export const ghostButtonColors = '';

export const buttonStyles = (props: ButtonProps) => {
  const resolvedVariant = props.variant || 'default';
  return mx(
    'inline-flex select-none items-center justify-center text-sm font-medium',
    props.rounding ?? 'rounded-md',
    props.spacing ?? (props.compact ? 'p-1.5' : 'pli-4 plb-2'),
    'transition-color duration-100',
    defaultHover(props),
    resolvedVariant === 'default' && 'border border-neutral-100 dark:border-neutral-650',
    resolvedVariant !== 'ghost' && !props.disabled && 'hover:focus:border-neutral-100 hover:border-transparent',
    resolvedVariant === 'default' && defaultButtonColors,
    resolvedVariant === 'ghost' && ghostButtonColors,
    resolvedVariant === 'primary' && 'border border-primary-550 hover:border-transparent',
    resolvedVariant === 'primary' && primaryButtonColors,
    resolvedVariant === 'outline' &&
      'text-neutral-700 border border-neutral-600 dark:border-neutral-300 dark:text-neutral-150',
    defaultFocus,
    props.disabled
      ? defaultDisabled
      : resolvedVariant !== 'outline' && resolvedVariant !== 'ghost' && 'button-elevation',
    // Register all radix states
    'group',
    defaultActive
  );
};
