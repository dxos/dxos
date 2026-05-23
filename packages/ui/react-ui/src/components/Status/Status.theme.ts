//
// Copyright 2023 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import type { ComponentFunction, Theme } from '@dxos/ui-types';

export type StatusStyleProps = {
  variant?: 'default' | 'main-bottom';
  indeterminate?: boolean;
};

const root: ComponentFunction<StatusStyleProps> = ({ variant = 'default' }, ...etc) =>
  mx(
    'h-1 relative rounded-full overflow-hidden',
    variant === 'main-bottom' ? 'w-full block' : 'inline-20 inline-block bg-base-surface',
    ...etc,
  );

const bar: ComponentFunction<StatusStyleProps> = ({ variant = 'default', indeterminate }, ...etc) =>
  mx(
    'absolute inset-y-0 block rounded-full',
    variant === 'main-bottom' ? 'bg-composer-300' : 'bg-un-accent',
    indeterminate ? 'animate-progress-indeterminate' : 'start-0',
    ...etc,
  );

export const statusTheme: Theme<StatusStyleProps> = {
  root,
  bar,
};
