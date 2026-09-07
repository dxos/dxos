//
// Copyright 2022 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Elevation, type Theme } from '@dxos/ui-types';

import { tooltipContent } from './tooltipContent';

export type TooltipStyleProps = Partial<{
  elevation: Elevation;
}>;

/**
 * The floating element. The machine positions it with an inline `z-index: var(--z-index)`, which
 * outranks any `z-*` class, so the layer is handed over through the variable.
 */
const positioner: ComponentFunction<TooltipStyleProps> = ({ elevation }, ...etc) =>
  mx(elevation === 'dialog' ? '[--z-index:53]' : elevation === 'toast' ? '[--z-index:43]' : '[--z-index:50]', ...etc);

/** Two rotated squares painted from `--arrow-background`; the size is the machine's `--arrow-size`. */
const arrow: ComponentFunction<TooltipStyleProps> = (_props, ...etc) =>
  mx('[--arrow-size:8px] [--arrow-background:var(--color-inverse-surface)]', ...etc);

export const tooltipTheme: Theme<TooltipStyleProps> = {
  positioner,
  content: tooltipContent,
  arrow,
};
