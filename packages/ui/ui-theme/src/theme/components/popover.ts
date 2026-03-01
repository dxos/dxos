//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Elevation, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';
import { focusRing, surfaceShadow, surfaceZIndex } from '../fragments';

export type PopoverStyleProps = Partial<{
  constrainBlock: boolean;
  constrainInline: boolean;
  elevation: Elevation;
}>;

export const popoverViewport: ComponentFunction<PopoverStyleProps> = ({ constrainBlock, constrainInline }, ...etc) =>
  mx(
    'flex flex-col rounded-md',
    constrainBlock && 'max-h-(--radix-popover-content-available-height) overflow-hidden',
    constrainInline && 'max-w-(--radix-popover-content-available-width) overflow-hidden',
    ...etc,
  );

export const popoverContent: ComponentFunction<PopoverStyleProps> = ({ elevation }, ...etc) =>
  mx(
    'dx-modal-surface border border-separator rounded-md',
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
