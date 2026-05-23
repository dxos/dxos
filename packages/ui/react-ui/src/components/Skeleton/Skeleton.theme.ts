//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import type { ComponentFunction, Theme } from '@dxos/ui-types';

export type SkeletonStyleProps = {
  variant?: 'default' | 'circle' | 'text';
};

const root: ComponentFunction<SkeletonStyleProps> = ({ variant = 'default' }, ...etc) =>
  mx(
    'animate-pulse bg-neutral-300 dark:bg-neutral-700 rounded-md',
    variant === 'circle' && 'rounded-full',
    variant === 'text' && 'rounded-sm',
    ...etc,
  );

export const skeletonTheme: Theme<SkeletonStyleProps> = {
  root,
};
