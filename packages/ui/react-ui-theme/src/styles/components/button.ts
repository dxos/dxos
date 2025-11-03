//
// Copyright 2022 DXOS.org
//

import type { ComponentFunction, Density, Elevation, Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';
import { ghostHover } from '../fragments';

export const primaryButtonColors =
  'text-accentSurfaceText bg-accentSurface hover:bg-accentSurfaceHover aria-pressed:bg-primary-500 dark:aria-pressed:bg-primary-500 data-[state=open]:bg-primary-500 dark:data-[state=open]:bg-primary-500 aria-checked:bg-primary-500 dark:aria-checked:bg-primary-500 aria-checked:text-primary-100';

export const staticDefaultButtonColors = 'bg-inputSurface';

export const defaultButtonColors = mx(
  staticDefaultButtonColors,
  'data-[state=open]:bg-inputSurface aria-pressed:text-accentText aria-pressed:bg-baseSurface aria-checked:text-accentText aria-checked:bg-baseSurface',
);

export const ghostButtonColors = mx(
  ghostHover,
  'hover:text-inherit data-[state=open]:bg-inputSurface aria-pressed:text-accentText aria-pressed:bg-baseSurface aria-checked:text-accentText aria-checked:bg-baseSurface',
);

export type ButtonStyleProps = Partial<{
  inGroup?: boolean;
  textWrap?: boolean;
  density: Density;
  elevation: Elevation;
  disabled: boolean;
  variant: 'default' | 'primary' | 'ghost' | 'outline';
}>;

export const buttonRoot: ComponentFunction<ButtonStyleProps> = (_props, ...etc) =>
  mx('dx-button dx-focus-ring group max-w-full [&>span]:truncate', ...etc);

export const buttonGroup: ComponentFunction<{ elevation?: Elevation }> = (props, ...etc) =>
  mx('inline-flex rounded-sm [&>:first-child]:rounded-is-sm [&>:last-child]:rounded-ie-sm [&>button]:relative', ...etc);

export const buttonTheme: Theme<ButtonStyleProps> = {
  root: buttonRoot,
  group: buttonGroup,
};
