//
// Copyright 2022 DXOS.org
//

import type { ComponentFunction, Density, Elevation, Theme } from '@dxos/ui-types';

import { mx } from '../../util';
import { ghostHover } from '../fragments';

// TODO(burdon): Replace fragments with component classes.

export const primaryButtonColors =
  'text-accent-surface-text bg-accent-surface hover:bg-accent-surface-hover aria-pressed:bg-primary-500 dark:aria-pressed:bg-primary-500 data-[state=open]:bg-primary-500 dark:data-[state=open]:bg-primary-500 aria-checked:bg-primary-500 dark:aria-checked:bg-primary-500 aria-checked:text-primary-100';

export const staticDefaultButtonColors = 'bg-input-surface text-input-surface-text';

export const defaultButtonColors = mx(
  staticDefaultButtonColors,
  'data-[state=open]:bg-input-surface aria-pressed:text-accent-text aria-pressed:bg-base-surface aria-checked:text-accent-text aria-checked:bg-base-surface',
);

export const ghostButtonColors = mx(
  ghostHover,
  'hover:text-inherit data-[state=open]:bg-input-surface aria-pressed:text-accent-text aria-pressed:bg-base-surface aria-checked:text-accent-text aria-checked:bg-base-surface',
);

export type ButtonStyleProps = Partial<{
  inGroup?: boolean;
  textWrap?: boolean;
  density: Density;
  elevation: Elevation;
  disabled: boolean;
  variant: 'default' | 'primary' | 'ghost' | 'outline';
}>;

const buttonRoot: ComponentFunction<ButtonStyleProps> = (_props, ...etc) => {
  return mx('dx-button dx-focus-ring group max-w-full [&_span]:truncate', ...etc);
};

const buttonGroup: ComponentFunction<{ elevation?: Elevation }> = (_props, ...etc) => {
  return mx(
    'inline-flex rounded-xs [&>:first-child]:rounded-w-sm [&>:last-child]:rounded-ie-sm [&>button]:relative',
    ...etc,
  );
};

export const buttonTheme: Theme<ButtonStyleProps> = {
  root: buttonRoot,
  group: buttonGroup,
};
