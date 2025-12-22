//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Elevation, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';
import { chromeText, popperMotion, surfaceShadow, surfaceZIndex } from '../fragments';

export type TooltipStyleProps = Partial<{
  elevation: Elevation;
}>;

export const tooltipContent: ComponentFunction<TooltipStyleProps> = ({ elevation }, ...etc) =>
  mx(
    'inline-flex items-center rounded-sm plb-1 pli-2 max-is-64 bg-inverseSurface text-inverseSurfaceText',
    popperMotion,
    surfaceShadow({ elevation: 'positioned' }),
    surfaceZIndex({ elevation, level: 'tooltip' }),
    chromeText,
    ...etc,
  );

export const tooltipArrow: ComponentFunction<TooltipStyleProps> = (_props, ...etc) => mx('fill-inverseSurface', ...etc);

export const tooltipTheme: Theme<TooltipStyleProps> = {
  content: tooltipContent,
  arrow: tooltipArrow,
};
