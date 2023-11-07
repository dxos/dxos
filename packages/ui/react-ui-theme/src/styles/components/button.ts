//
// Copyright 2022 DXOS.org
//

import type { Density, Elevation, ComponentFunction, Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';
import {
  hoverColors,
  coarseButtonDimensions,
  fineButtonDimensions,
  openOutline,
  staticDisabled,
  focusRing,
  contentElevation,
} from '../fragments';

// TODO(burdon): Ghost styles should have no border (be really flat).

export const primaryAppButtonColors =
  'bg-primary-550 dark:bg-primary-550 text-white aria-pressed:bg-primary-500 dark:aria-pressed:bg-primary-500 aria-pressed:text-primary-100 aria-checked:bg-primary-500 dark:aria-checked:bg-primary-500 aria-checked:text-primary-100 hover:bg-primary-600 dark:hover:bg-primary-600 hover:text-white dark:hover:text-white';
export const defaultAppButtonColors =
  'bg-white aria-pressed:bg-primary-100 aria-checked:bg-primary-100 text-neutral-800 aria-pressed:text-primary-800 aria-checked:text-primary-800 dark:bg-neutral-800 dark:aria-pressed:bg-primary-700 dark:aria-checked:bg-primary-700 dark:text-neutral-50 dark:aria-pressed:text-primary-50 dark:aria-checked:text-primary-50';
export const defaultOsButtonColors = 'bg-white/50 text-neutral-900 dark:bg-neutral-750/50 dark:text-neutral-50';
export const ghostButtonColors =
  'hover:bg-transparent dark:hover:bg-transparent hover:text-primary-500 dark:hover:text-primary-300 aria-pressed:text-primary-800 aria-checked:text-primary-800 dark:aria-pressed:text-primary-50 dark:aria-checked:text-primary-50';

export type ButtonStyleProps = Partial<{
  inGroup?: boolean;
  textWrap?: boolean;
  density: Density;
  elevation: Elevation;
  disabled: boolean;
  variant: 'default' | 'primary' | 'ghost' | 'outline';
}>;

export const buttonRoot: ComponentFunction<ButtonStyleProps> = (props, ...etc) => {
  const resolvedVariant = props.variant ?? 'default';
  return mx(
    'font-medium text-sm shrink-0 inline-flex select-none items-center justify-center overflow-hidden',
    'transition-color duration-100',
    props.density === 'fine' ? fineButtonDimensions : coarseButtonDimensions,
    props.disabled && staticDisabled,
    !props.inGroup && 'rounded-md',
    !props.textWrap && 'text-ellipsis whitespace-nowrap',
    !props.disabled &&
      !props.inGroup &&
      (resolvedVariant === 'default' || resolvedVariant === 'primary') &&
      contentElevation({ elevation: props.elevation }),
    !props.disabled && hoverColors,
    resolvedVariant !== 'outline' && ' hover:border-transparent dark:hover:border-transparent',
    resolvedVariant === 'default' && defaultAppButtonColors,
    !props.disabled && resolvedVariant === 'ghost' && ghostButtonColors,
    resolvedVariant === 'primary' && primaryAppButtonColors,
    resolvedVariant === 'outline' &&
      'text-neutral-700 border border-neutral-600 dark:border-neutral-300 dark:text-neutral-150',
    !props.disabled && focusRing,
    openOutline,
    // Register all radix states
    'group',
    ...etc,
  );
};

export const buttonGroup: ComponentFunction<{ elevation?: Elevation }> = (props, ...etc) => {
  return mx(
    'inline-flex rounded-md [&>:first-child]:rounded-is-md [&>:last-child]:rounded-ie-md [&>button]:relative',
    contentElevation({ elevation: props.elevation }),
    ...etc,
  );
};

export const buttonTheme: Theme<ButtonStyleProps> = {
  root: buttonRoot,
  group: buttonGroup,
};
