//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Elevation, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';
import { chromeText, surfaceShadow, surfaceZIndex } from '../fragments';

export type TooltipStyleProps = Partial<{
  elevation: Elevation;
}>;

export const tooltipContent: ComponentFunction<TooltipStyleProps> = ({ elevation }, ...etc) =>
  mx(
    'inline-flex items-center rounded-xs py-1 px-2 max-inline-64 bg-inverse-surface text-inverse-text',
    // popperMotion,
    surfaceShadow({ elevation: 'positioned' }),
    surfaceZIndex({ elevation, level: 'tooltip' }),
    chromeText,
    ...etc,
  );

export const tooltipArrow: ComponentFunction<TooltipStyleProps> = (_props, ...etc) =>
  mx('fill-inverse-surface', ...etc);

export const tooltipTheme: Theme<TooltipStyleProps> = {
  content: tooltipContent,
  arrow: tooltipArrow,
};
