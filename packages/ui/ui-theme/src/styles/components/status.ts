//
// Copyright 2023 DXOS.org
//

import type { ComponentFunction, Theme } from '@dxos/ui-types';

import { mx } from '../../util';

export type StatusStyleProps = {
  indeterminate?: boolean;
  variant?: 'default' | 'main-bottom';
};

export const statusRoot: ComponentFunction<StatusStyleProps> = ({ variant = 'default' }, ...etc) =>
  mx(
    'bs-1 relative bg-hoverOverlay rounded-full overflow-hidden',
    variant === 'main-bottom' ? 'is-full block' : 'is-20 inline-block',
    ...etc,
  );

export const statusBar: ComponentFunction<StatusStyleProps> = ({ indeterminate, variant = 'default' }, ...etc) =>
  mx(
    'absolute inset-block-0 block rounded-full',
    variant === 'main-bottom' ? 'bg-accentSurface' : 'bg-unAccent',
    indeterminate ? 'animate-progress-indeterminate' : 'inline-start-0',
    ...etc,
  );

export const statusTheme: Theme<StatusStyleProps> = {
  root: statusRoot,
  bar: statusBar,
};
