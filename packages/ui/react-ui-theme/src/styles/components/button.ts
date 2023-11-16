//
// Copyright 2022 DXOS.org
//

import type { Density, Elevation, ComponentFunction, Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';
import {
  hoverColors,
  coarseButtonDimensions,
  fineButtonDimensions,
  staticDisabled,
  focusRing,
  contentElevation,
  ghostHover,
} from '../fragments';

export const primaryAppButtonColors =
  'bg-primary-550 dark:bg-primary-550 text-white aria-pressed:bg-primary-500 dark:aria-pressed:bg-primary-500 aria-pressed:text-primary-100 data-[state=open]:bg-primary-500 dark:data-[state=open]:bg-primary-500 data-[state=open]:text-primary-100 aria-checked:bg-primary-500 dark:aria-checked:bg-primary-500 aria-checked:text-primary-100 hover:bg-primary-600 dark:hover:bg-primary-600 hover:text-white dark:hover:text-white';

export const defaultAppButtonColors =
  'text-neutral-800 dark:text-neutral-50 bg-white dark:bg-neutral-800 aria-pressed:text-primary-800 aria-pressed:bg-primary-100 dark:aria-pressed:text-primary-50 dark:aria-pressed:bg-primary-700 data-[state=open]:text-primary-800 data-[state=open]:bg-primary-100 dark:data-[state=open]:text-primary-50 dark:data-[state=open]:bg-primary-700 aria-checked:text-primary-800 aria-checked:bg-primary-100 dark:aria-checked:text-primary-50 dark:aria-checked:bg-primary-700';

export const ghostButtonColors =
  ghostHover +
  ' hover:text-inherit dark:hover:text-inherit aria-pressed:bg-neutral-450/5 dark:aria-pressed:bg-neutral-25/5 data-[state=open]:bg-neutral-450/5 dark:data-[state=open]:bg-neutral-25/5 aria-checked:bg-neutral-450/5 dark:aria-checked:bg-neutral-25/5';

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
