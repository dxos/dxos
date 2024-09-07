//
// Copyright 2022 DXOS.org
//

import type { Density, Elevation, ComponentFunction, Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';
import { contentElevation, ghostHover } from '../fragments';

export const primaryButtonColors =
  'text-inverse bg-accentSurface hover:bg-accentSurfaceHover aria-pressed:bg-primary-500 dark:aria-pressed:bg-primary-500 data-[state=open]:bg-primary-500 dark:data-[state=open]:bg-primary-500 aria-checked:bg-primary-500 dark:aria-checked:bg-primary-500 aria-checked:text-primary-100';

export const staticDefaultButtonColors = 'bg-input';

export const defaultButtonColors =
  staticDefaultButtonColors +
  ' data-[state=open]:bg-input aria-pressed:text-accentText aria-pressed:bg-base aria-checked:text-accentText aria-checked:bg-base';

export const ghostButtonColors =
  ghostHover +
  ' hover:text-inherit data-[state=open]:bg-input aria-pressed:text-accentText aria-pressed:bg-base aria-checked:text-accentText aria-checked:bg-base';

export type ButtonStyleProps = Partial<{
  inGroup?: boolean;
  textWrap?: boolean;
  density: Density;
  elevation: Elevation;
  disabled: boolean;
  variant: 'default' | 'primary' | 'ghost' | 'outline';
}>;

export const buttonRoot: ComponentFunction<ButtonStyleProps> = (_props, ...etc) => {
  return mx('ch-button ch-focus-ring group', ...etc);
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
