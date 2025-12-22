//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Elevation, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';
import { focusRing, modalSurface, surfaceShadow, surfaceZIndex } from '../fragments';

export type PopoverStyleProps = Partial<{
  constrainBlock: boolean;
  constrainInline: boolean;
  elevation: Elevation;
}>;

export const popoverViewport: ComponentFunction<PopoverStyleProps> = ({ constrainBlock, constrainInline }, ...etc) =>
  mx(
    'rounded-md',
    constrainBlock && 'max-bs-[--radix-popover-content-available-height] overflow-y-auto',
    constrainInline && 'max-is-[--radix-popover-content-available-width] overflow-x-auto',
    ...etc,
  );

export const popoverContent: ComponentFunction<PopoverStyleProps> = ({ elevation }, ...etc) =>
  mx(
    'border border-separator rounded-md',
    modalSurface,
    surfaceShadow({ elevation: 'positioned' }),
    surfaceZIndex({ elevation, level: 'menu' }),
    focusRing,
    ...etc,
  );

export const popoverArrow: ComponentFunction<PopoverStyleProps> = (_props, ...etc) => mx('fill-separator', ...etc);

export const popoverTheme: Theme<PopoverStyleProps> = {
  content: popoverContent,
  viewport: popoverViewport,
  arrow: popoverArrow,
};
