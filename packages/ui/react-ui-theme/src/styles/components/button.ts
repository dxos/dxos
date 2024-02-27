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

export const primaryButtonColors =
  'fg-inverse surface-accent hover:surface-accentHover aria-pressed:bg-primary-500 dark:aria-pressed:bg-primary-500 data-[state=open]:bg-primary-500 dark:data-[state=open]:bg-primary-500 aria-checked:bg-primary-500 dark:aria-checked:bg-primary-500 aria-checked:text-primary-100';

export const staticDefaultButtonColors = 'surface-input';

export const defaultButtonColors =
  staticDefaultButtonColors +
  ' data-[state=open]:surface-input aria-pressed:fg-accent aria-pressed:surface-base aria-checked:fg-accent aria-checked:surface-base';

export const ghostButtonColors =
  ghostHover +
  ' hover:text-inherit data-[state=open]:surface-input aria-pressed:fg-accent aria-pressed:surface-base aria-checked:fg-accent aria-checked:surface-base';

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
    !props.inGroup && 'rounded-sm',
    !props.textWrap && 'text-ellipsis whitespace-nowrap',
    !props.disabled &&
      !props.inGroup &&
      (resolvedVariant === 'default' || resolvedVariant === 'primary') &&
      contentElevation({ elevation: props.elevation }),
    !props.disabled && hoverColors,
    resolvedVariant !== 'outline' && ' hover:border-transparent dark:hover:border-transparent',
    resolvedVariant === 'default' && defaultButtonColors,
    !props.disabled && resolvedVariant === 'ghost' && ghostButtonColors,
    resolvedVariant === 'primary' && primaryButtonColors,
    resolvedVariant === 'outline' && 'border separator-base',
    !props.disabled && focusRing,
    // Register all radix states
    'group',
    ...etc,
  );
};

export const buttonGroup: ComponentFunction<{ elevation?: Elevation }> = (props, ...etc) => {
  return mx(
    'inline-flex rounded-sm [&>:first-child]:rounded-is-sm [&>:last-child]:rounded-ie-sm [&>button]:relative',
    contentElevation({ elevation: props.elevation }),
    ...etc,
  );
};

export const buttonTheme: Theme<ButtonStyleProps> = {
  root: buttonRoot,
  group: buttonGroup,
};
