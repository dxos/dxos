//
// Copyright 2022 DXOS.org
//

import { ComponentFragment, ComponentFunction, Density, Elevation } from '@dxos/aurora-types';
import type { Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import {
  coarseButtonDimensions,
  contentElevation,
  fineButtonDimensions,
  focusRing,
  hoverColors,
  openOutline,
  staticDisabled,
} from '../fragments';
import {
  AppButtonStyleProps,
  defaultAppButtonColors,
  ghostButtonColors,
  OsButtonStyleProps,
  primaryAppButtonColors,
} from './button';

export type AppSelectStyleProps = Partial<{
  density: Density;
  elevation: Elevation;
  disabled: boolean;
  variant: 'default' | 'primary' | 'ghost' | 'outline';
}>;

// TODO(burdon): Share with button?
const sharedSelectStyles: ComponentFragment<AppButtonStyleProps | OsButtonStyleProps> = (props) => {
  return [
    'inline-flex select-none items-center justify-center transition-color duration-100',
    props.density === 'fine' ? fineButtonDimensions : coarseButtonDimensions,
    // Register all radix states
    'group',
    props.disabled && staticDisabled,
  ];
};

// TODO(burdon): inGroup?
export const selectTrigger: ComponentFunction<AppSelectStyleProps> = (props, ...etc) => {
  const resolvedVariant = props.variant ?? 'default';
  return mx(
    'font-medium text-sm',
    !props.disabled &&
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
    ...sharedSelectStyles(props),
    ...etc,
  );
};

export const selectContent: ComponentFunction<AppSelectStyleProps> = (props, ...etc) => {
  return mx('font-medium text-sm', ...etc);
};

export const selectTheme: Theme<AppSelectStyleProps> = {
  trigger: selectTrigger,
  content: selectContent,
};
