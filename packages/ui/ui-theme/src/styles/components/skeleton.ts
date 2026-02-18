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
    'animate-pulse bg-neutral-250 dark:bg-neutral-750 rounded-md',
    variant === 'circle' && 'rounded-full',
    variant === 'text' && 'rounded',
    ...etc,
  );

export const skeletonTheme: Theme<SkeletonStyleProps> = {
  root: skeletonRoot,
};
