//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Theme, type Elevation } from '@dxos/react-ui-types';

import { mx } from '../../util';
import { focusRing, modalSurface, surfaceShadow, surfaceZIndex } from '../fragments';

export type PopoverStyleProps = Partial<{
  constrainInline?: boolean;
  constrainBlock: boolean;
  elevation: Elevation;
}>;

export const popoverViewport: ComponentFunction<PopoverStyleProps> = ({ constrainInline, constrainBlock }, ...etc) =>
  mx(
    'p-1 rounded-lg',
    constrainInline && 'max-is-[--radix-popover-content-available-width] overflow-x-auto',
    constrainBlock && 'max-bs-[--radix-popover-content-available-height] overflow-y-auto',
    ...etc,
  );

export const popoverContent: ComponentFunction<PopoverStyleProps> = ({ elevation }, ...etc) =>
  mx(
    'border border-separator rounded-lg',
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
