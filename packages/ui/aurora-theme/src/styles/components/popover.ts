//
// Copyright 2023 DXOS.org
//

import { ComponentFunction, Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { arrow, chromeSurface, chromeText, focusRing, surfaceElevation } from '../fragments';

export type PopoverStyleProps = {};

export const popoverContent: ComponentFunction<PopoverStyleProps> = (_props, ...etc) =>
  mx(
    'rounded-md plb-1 pli-2 radix-side-top:animate-slide-up radix-side-bottom:animate-slide-down',
    chromeSurface,
    surfaceElevation({ elevation: 'group' }),
    chromeText,
    focusRing,
    ...etc,
  );

export const popoverArrow: ComponentFunction<PopoverStyleProps> = (_props, ...etc) => mx(arrow, ...etc);

export const popoverTheme: Theme<PopoverStyleProps> = {
  content: popoverContent,
  arrow: popoverArrow,
};
