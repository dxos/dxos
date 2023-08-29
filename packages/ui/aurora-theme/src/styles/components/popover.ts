//
// Copyright 2023 DXOS.org
//

import { ComponentFunction, Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { arrow, chromeSurface, focusRing, surfaceElevation } from '../fragments';

export type PopoverStyleProps = {};

export const popoverContent: ComponentFunction<PopoverStyleProps> = (_props, ...etc) =>
  mx(
    'rounded-md p-1.5 radix-side-top:animate-slide-up radix-side-bottom:animate-slide-down relative',
    chromeSurface,
    surfaceElevation({ elevation: 'group' }),
    focusRing,
    ...etc,
  );

export const popoverArrow: ComponentFunction<PopoverStyleProps> = (_props, ...etc) => mx(arrow, ...etc);

export const popoverTheme: Theme<PopoverStyleProps> = {
  content: popoverContent,
  arrow: popoverArrow,
};
