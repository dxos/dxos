//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Elevation, type Theme } from '@dxos/ui-types';

import { focusRing, surfaceShadow, surfaceZIndex } from '../../fragments';
import { mx } from '../../util';

export type PopoverStyleProps = Partial<{
  constrainBlock: boolean;
  constrainInline: boolean;
  elevation: Elevation;
}>;

export const popoverContent: ComponentFunction<PopoverStyleProps> = ({ elevation }, ...etc) =>
  mx(
    'dx-modal-surface border border-separator rounded-sm',
    surfaceShadow({ elevation: 'positioned' }),
    surfaceZIndex({ elevation, level: 'menu' }),
    focusRing,
    ...etc,
  );

export const popoverViewport: ComponentFunction<PopoverStyleProps> = ({ constrainBlock, constrainInline }, ...etc) =>
  mx(
    'flex flex-col min-h-0',
    // Ensures it respects available height from Radix (or 100dvh).
    constrainBlock &&
      'overflow-hidden max-h-[min(var(--radix-popover-content-available-height),calc(100dvh-var(--spacing-screen-border)*2))]',
    constrainInline && 'overflow-hidden max-w-(--radix-popover-content-available-width)',
    ...etc,
  );

export const popoverArrow: ComponentFunction<PopoverStyleProps> = (_props, ...etc) => mx('fill-separator', ...etc);

export const popoverTheme: Theme<PopoverStyleProps> = {
  content: popoverContent,
  viewport: popoverViewport,
  arrow: popoverArrow,
};
