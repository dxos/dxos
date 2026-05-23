//
// Copyright 2023 DXOS.org
//

import { mx, surfaceShadow, surfaceZIndex } from '@dxos/ui-theme';
import { type ComponentFunction, type Elevation, type Theme } from '@dxos/ui-types';

export type TooltipStyleProps = Partial<{
  elevation: Elevation;
}>;

export const tooltipContent: ComponentFunction<TooltipStyleProps> = ({ elevation }, ...etc) =>
  mx(
    'inline-flex items-center p-1 max-w-64 text-sm bg-inverse-surface text-inverse-foreground rounded-sm',
    surfaceShadow({ elevation: 'positioned' }),
    surfaceZIndex({ elevation, level: 'tooltip' }),
    ...etc,
  );

export const tooltipArrow: ComponentFunction<TooltipStyleProps> = (_props, ...etc) =>
  mx('fill-inverse-surface', ...etc);

export const tooltipTheme: Theme<TooltipStyleProps> = {
  content: tooltipContent,
  arrow: tooltipArrow,
};
