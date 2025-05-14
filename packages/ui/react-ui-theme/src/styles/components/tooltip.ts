//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Theme, type Elevation } from '@dxos/react-ui-types';

import { mx } from '../../util';
import { arrow, chromeText, surfaceShadow, popperMotion, surfaceZIndex } from '../fragments';

export type TooltipStyleProps = Partial<{
  elevation: Elevation;
}>;

export const tooltipContent: ComponentFunction<TooltipStyleProps> = ({ elevation }, ...etc) =>
  mx(
    'inline-flex items-center rounded-md plb-1 pli-2 max-is-64 bg-inverseSurface text-inverseSurfaceText',
    popperMotion,
    surfaceShadow({ elevation: 'positioned' }),
    surfaceZIndex({ elevation, level: 'tooltip' }),
    chromeText,
    ...etc,
  );

export const tooltipArrow: ComponentFunction<TooltipStyleProps> = (_props, ...etc) => mx(arrow, ...etc);

export const tooltipTheme: Theme<TooltipStyleProps> = {
  content: tooltipContent,
  arrow: tooltipArrow,
};
