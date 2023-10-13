//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { arrow, chromeText, surfaceElevation, chromeSurface, popperMotion } from '../fragments';

export type TooltipStyleProps = {};

export const tooltipContent: ComponentFunction<TooltipStyleProps> = (_props, ...etc) =>
  mx(
    'inline-flex items-center rounded-md plb-2 pli-3',
    chromeSurface,
    popperMotion,
    surfaceElevation({ elevation: 'group' }),
    chromeText,
    ...etc,
  );

export const tooltipArrow: ComponentFunction<TooltipStyleProps> = (_props, ...etc) => mx(arrow, ...etc);

export const tooltipTheme: Theme<TooltipStyleProps> = {
  content: tooltipContent,
  arrow: tooltipArrow,
};
