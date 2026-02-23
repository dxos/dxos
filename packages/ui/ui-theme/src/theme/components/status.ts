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
    'block-1 relative bg-hover-overlay rounded-full overflow-hidden',
    variant === 'main-bottom' ? 'inline-full block' : 'inline-20 inline-block',
    ...etc,
  );

export const statusBar: ComponentFunction<StatusStyleProps> = ({ indeterminate, variant = 'default' }, ...etc) =>
  mx(
    'absolute inset-block-0 block rounded-full',
    variant === 'main-bottom' ? 'bg-accent-surface' : 'bg-un-accent',
    indeterminate ? 'animate-progress-indeterminate' : 'start-0',
    ...etc,
  );

export const statusTheme: Theme<StatusStyleProps> = {
  root: statusRoot,
  bar: statusBar,
};
