//
// Copyright 2022 DXOS.org
//

import {
  defaultDisabled,
  hover,
  defaultActive,
  osActive,
  focus,
  buttonFine,
  buttonCoarse,
  mx
} from '@dxos/aurora-theme';

import { ThemeContextValue } from '../ThemeProvider';
import { ButtonProps } from './ButtonProps';

export const primaryAppButtonColors =
  'bg-primary-550 dark:bg-primary-550 text-white hover:bg-primary-600 dark:hover:bg-primary-600 hover:text-white dark:hover:text-white';
export const defaultAppButtonColors = 'bg-white text-neutral-800 dark:bg-neutral-800 dark:text-neutral-50';
export const defaultOsButtonColors = 'bg-white/50 text-neutral-900 dark:bg-neutral-750/50 dark:text-neutral-50';
export const ghostAppButtonColors =
  'hover:bg-transparent dark:hover:bg-transparent hover:text-primary-500 dark:hover:text-primary-300';

export const buttonStyles = (
  props: Partial<ButtonProps> = {},
  themeVariant: ThemeContextValue['themeVariant'] = 'app'
) => {
  const isOsTheme = themeVariant === 'os';
  const resolvedVariant = props.variant ?? 'default';
  return mx(
    'inline-flex select-none items-center justify-center transition-color duration-100',
    props.density === 'fine' ? buttonFine : buttonCoarse,
    isOsTheme ? 'rounded font-system-medium text-xs' : 'rounded-md font-medium text-sm',
    hover(props, themeVariant),
    !isOsTheme && resolvedVariant !== 'outline' && ' hover:border-transparent dark:hover:border-transparent',
    resolvedVariant === 'default' && (isOsTheme ? defaultOsButtonColors : defaultAppButtonColors),
    !props.disabled && resolvedVariant === 'ghost' && ghostAppButtonColors,
    resolvedVariant === 'primary' && primaryAppButtonColors,
    resolvedVariant === 'outline' &&
      'text-neutral-700 border border-neutral-600 dark:border-neutral-300 dark:text-neutral-150',
    focus({ disabled: props.disabled }, themeVariant),
    props.disabled && defaultDisabled,
    // Register all radix states
    'group',
    isOsTheme ? osActive('be') : defaultActive
  );
};
