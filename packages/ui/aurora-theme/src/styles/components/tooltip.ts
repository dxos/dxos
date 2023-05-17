//
// Copyright 2023 DXOS.org
//

import { ComponentFunction, Theme } from '@dxos/aurora-types';

import { mx } from '../../util';

export type TooltipStyleProps = {};

export const tooltipContent: ComponentFunction<TooltipStyleProps> = (_props, ...etc) => mx(...etc);

export const tooltipTheme: Theme<TooltipStyleProps> = {
  content: tooltipContent
};
