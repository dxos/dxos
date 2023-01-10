//
// Copyright 2022 DXOS.org
//

import { defaultDisabled, defaultFocus, defaultHover, defaultActive } from '../../styles';
import { mx } from '../../util';
import { ThemeContextValue } from '../ThemeProvider';
import { ButtonProps } from './ButtonProps';

export const primaryAppButtonColors = 'bg-primary-600 text-white hover:bg-primary-650';
export const defaultAppButtonColors = 'bg-white text-neutral-900 dark:bg-neutral-750 dark:text-neutral-50';
export const defaultOsButtonColors = 'bg-neutral-50/50 text-neutral-950 dark:bg-neutral-800/50 dark:text-neutral-50';
export const ghostAppButtonColors = '';

export const buttonStyles = (
  props: Partial<ButtonProps> = {},
  themeVariant: ThemeContextValue['themeVariant'] = 'app'
) => {
  const isOsTheme = themeVariant === 'os';
  const resolvedVariant = props.variant ?? 'default';
  return mx(
    'inline-flex select-none items-center justify-center transition-color duration-100',
    props.compact ? 'pli-2 plb-1.5' : 'pli-4 plb-2',
    isOsTheme ? 'rounded font-system-medium text-xs' : 'rounded-md font-medium text-sm',
    isOsTheme ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800' : defaultHover(props),
    !isOsTheme && resolvedVariant === 'default' && 'border border-neutral-100 dark:border-neutral-650',
    resolvedVariant !== 'ghost' && !props.disabled && 'hover:focus:border-neutral-100 hover:border-transparent',
    resolvedVariant === 'default' && (isOsTheme ? defaultOsButtonColors : defaultAppButtonColors),
    resolvedVariant === 'ghost' && ghostAppButtonColors,
    resolvedVariant === 'primary' && 'border border-primary-550 hover:border-transparent',
    resolvedVariant === 'primary' && primaryAppButtonColors,
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
