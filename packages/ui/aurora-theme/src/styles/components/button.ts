//
// Copyright 2022 DXOS.org
//

import type { Density, Elevation, ComponentFunction } from '@dxos/aurora-types';

import { mx } from '../../util';
import {
  appHover,
  buttonCoarse,
  buttonFine,
  defaultActive,
  defaultDisabled,
  osActive,
  defaultFocus,
  osFocus
} from '../fragments';

export const primaryAppButtonColors =
  'bg-primary-550 dark:bg-primary-550 text-white hover:bg-primary-600 dark:hover:bg-primary-600 hover:text-white dark:hover:text-white';
export const defaultAppButtonColors = 'bg-white text-neutral-800 dark:bg-neutral-800 dark:text-neutral-50';
export const defaultOsButtonColors = 'bg-white/50 text-neutral-900 dark:bg-neutral-750/50 dark:text-neutral-50';
export const ghostButtonColors =
  'hover:bg-transparent dark:hover:bg-transparent hover:text-primary-500 dark:hover:text-primary-300';

export type AppButtonStyleProps = Partial<{
  density: Density;
  elevation: Elevation;
  disabled: boolean;
  variant: 'default' | 'primary' | 'ghost' | 'outline';
}>;

export type OsButtonStyleProps = Partial<{
  density: Density;
  disabled: boolean;
  variant: 'default' | 'ghost';
  sideInset: 'be';
}>;

const sharedButtonStyles: ComponentFunction<AppButtonStyleProps | OsButtonStyleProps> = (props) => {
  return mx(
    'inline-flex select-none items-center justify-center transition-color duration-100',
    props.density === 'fine' ? buttonFine : buttonCoarse,
    // Register all radix states
    'group',
    props.disabled && defaultDisabled
  );
};

export const buttonAppStyles: ComponentFunction<AppButtonStyleProps> = (props, ...etc) => {
  const resolvedVariant = props.variant ?? 'default';
  return mx(
    'rounded-md font-medium text-sm',
    !props.disabled &&
      (resolvedVariant === 'default' || resolvedVariant === 'primary') &&
      (props.elevation === 'group' ? 'shadow' : props.elevation === 'chrome' ? 'shadow-none' : 'shadow-md'),
    !props.disabled && appHover,
    resolvedVariant !== 'outline' && ' hover:border-transparent dark:hover:border-transparent',
    resolvedVariant === 'default' && defaultAppButtonColors,
    !props.disabled && resolvedVariant === 'ghost' && ghostButtonColors,
    resolvedVariant === 'primary' && primaryAppButtonColors,
    resolvedVariant === 'outline' &&
      'text-neutral-700 border border-neutral-600 dark:border-neutral-300 dark:text-neutral-150',
    !props.disabled && defaultFocus,
    defaultActive,
    sharedButtonStyles(props),
    ...etc
  );
};

export const buttonOsStyles: ComponentFunction<OsButtonStyleProps> = (props, ...etc) => {
  const resolvedVariant = props.variant ?? 'default';
  return mx(
    'rounded font-system-medium text-xs shadow-none',
    !props.disabled && appHover,
    resolvedVariant === 'default' && defaultOsButtonColors,
    !props.disabled && resolvedVariant === 'ghost' && ghostButtonColors,
    !props.disabled && osFocus,
    osActive(props.sideInset ?? 'be'),
    sharedButtonStyles(props),
    ...etc
  );
};
