//
// Copyright 2023 DXOS.org
//

import { mx, surfaceShadow, surfaceZIndex } from '@dxos/ui-theme';
import { type ComponentFunction } from '@dxos/ui-types';

import { type TooltipStyleProps } from './Tooltip.theme';

export const tooltipContent: ComponentFunction<TooltipStyleProps> = ({ elevation }, ...etc) =>
  mx(
    'inline-flex items-center p-1 max-w-64 text-sm bg-inverse-surface text-inverse-fg rounded-sm',
    surfaceShadow({ elevation: 'positioned' }),
    surfaceZIndex({ elevation, level: 'tooltip' }),
    ...etc,
  );
