//
// Copyright 2023 DXOS.org
//

import { ComponentFunction, Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { arrow, chromeText, minorSurfaceElevation } from '../fragments';
import { chromeSurface } from '../fragments/surface';

export type TooltipStyleProps = {};

export const tooltipContent: ComponentFunction<TooltipStyleProps> = (_props, ...etc) =>
  mx('inline-flex items-center rounded-md plb-1 pli-2', chromeSurface, minorSurfaceElevation, chromeText, ...etc);

export const tooltipArrow: ComponentFunction<TooltipStyleProps> = (_props, ...etc) => mx(arrow, ...etc);

export const tooltipTheme: Theme<TooltipStyleProps> = {
  content: tooltipContent,
  arrow: tooltipArrow,
};
