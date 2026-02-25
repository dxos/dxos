//
// Copyright 2026 DXOS.org
//

import type { ComponentFunction, Theme } from '@dxos/ui-types';

import { mx } from '../../util';

export type SkeletonStyleProps = {
  variant?: 'default' | 'circle' | 'text';
};

export const skeletonRoot: ComponentFunction<SkeletonStyleProps> = ({ variant = 'default' }, ...etc) =>
  mx(
    'animate-pulse bg-neutral-300 dark:bg-neutral-700 rounded-md',
    variant === 'circle' && 'rounded-full',
    variant === 'text' && 'rounded-sm',
    ...etc,
  );

export const skeletonTheme: Theme<SkeletonStyleProps> = {
  root: skeletonRoot,
};
