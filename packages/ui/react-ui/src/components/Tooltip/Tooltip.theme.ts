//
// Copyright 2023 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Elevation, type Theme } from '@dxos/ui-types';

import { tooltipContent } from './tooltipContent';

export type TooltipStyleProps = Partial<{
  elevation: Elevation;
}>;

const arrow: ComponentFunction<TooltipStyleProps> = (_props, ...etc) => mx('fill-inverse-surface', ...etc);

export const tooltipTheme: Theme<TooltipStyleProps> = {
  content: tooltipContent,
  arrow,
};
