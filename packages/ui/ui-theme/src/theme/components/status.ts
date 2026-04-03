//
// Copyright 2023 DXOS.org
//

import type { ComponentFunction, Theme } from '@dxos/ui-types';

import { mx } from '../../util';

export type StatusStyleProps = {
  variant?: 'default' | 'main-bottom';
  indeterminate?: boolean;
};

export const statusRoot: ComponentFunction<StatusStyleProps> = ({ variant = 'default' }, ...etc) =>
  mx(
    'h-1 relative rounded-full overflow-hidden',
    variant === 'main-bottom' ? 'w-full block' : 'inline-20 inline-block bg-base-surface',
    ...etc,
  );

export const statusBar: ComponentFunction<StatusStyleProps> = ({ variant = 'default', indeterminate }, ...etc) =>
  mx(
    'absolute inset-y-0 block rounded-full',
    variant === 'main-bottom' ? 'bg-composer-300' : 'bg-un-accent',
    indeterminate ? 'animate-progress-indeterminate' : 'start-0',
    ...etc,
  );

export const statusTheme: Theme<StatusStyleProps> = {
  root: statusRoot,
  bar: statusBar,
};
