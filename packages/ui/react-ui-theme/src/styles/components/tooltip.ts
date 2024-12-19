//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Theme, type Elevation } from '@dxos/react-ui-types';

import { mx } from '../../util';
import { arrow, chromeText, surfaceShadow, modalSurface, popperMotion, surfaceZIndex } from '../fragments';

export type TooltipStyleProps = Partial<{
  elevation: Elevation;
}>;

export const tooltipContent: ComponentFunction<TooltipStyleProps> = ({ elevation }, ...etc) =>
  mx(
    'inline-flex items-center rounded-md plb-2 pli-3 max-is-64',
    modalSurface,
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
