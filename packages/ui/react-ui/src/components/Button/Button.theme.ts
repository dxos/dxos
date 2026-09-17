//
// Copyright 2022 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import type { ComponentFunction, Density, Elevation, Theme } from '@dxos/ui-types';

export type ButtonStyleProps = Partial<{
  inGroup?: boolean;
  textWrap?: boolean;
  density: Density;
  elevation: Elevation;
  disabled: boolean;
  variant: 'default' | 'primary' | 'ghost' | 'outline' | 'destructive' | 'valence' | 'tag';
}>;

// The `tag` variant carries `dx-tag` too, so the hue rules in `tag.css` colour it by `data-hue`.
const root: ComponentFunction<ButtonStyleProps> = ({ variant }, ...etc) => {
  return mx('dx-button dx-focus-ring group gap-1 [&_span]:truncate', variant === 'tag' && 'dx-tag', ...etc);
};

const group: ComponentFunction<{ elevation?: Elevation }> = (_props, ...etc) => {
  return mx(
    'inline-flex rounded-xs [&>:first-child]:rounded-w-sm [&>:last-child]:rounded-ie-sm [&>button]:relative',
    ...etc,
  );
};

export const buttonTheme: Theme<ButtonStyleProps> = {
  root,
  group,
};
