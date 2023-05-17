//
// Copyright 2023 DXOS.org
//

import { ComponentFunction, Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { defaultTooltip } from '../fragments';

export type TooltipStyleProps = {};

export const tooltipContent: ComponentFunction<TooltipStyleProps> = (_props, ...etc) =>
  mx(
    'inline-flex items-center rounded-md plb-2 pli-3',
    'shadow-lg bg-white dark:bg-neutral-800',
    defaultTooltip,
    ...etc
  );

export const tooltipArrow: ComponentFunction<TooltipStyleProps> = (_props, ...etc) =>
  mx('fill-white dark:fill-neutral-800', ...etc);

export const tooltipTheme: Theme<TooltipStyleProps> = {
  content: tooltipContent,
  arrow: tooltipArrow
};
