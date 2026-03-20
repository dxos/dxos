//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Elevation, type Theme } from '@dxos/ui-types';

import { focusRing } from '../../fragments';
import { mx, surfaceShadow, surfaceZIndex } from '../../util';

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
    'flex flex-col min-h-0 min-w-popover-min-width',
    (constrainBlock || constrainInline) && 'overflow-hidden',
    // Ensures it respects available height from Radix (or 100dvh).
    // NOTE: Both h and max-h are required: h gives a definite height so that h-full in children (e.g. ScrollArea) can
    // resolve to a concrete pixel value; max-h then caps it so it can never exceed the viewport.
    constrainBlock && 'h-(--radix-popover-content-available-height)',
    constrainBlock &&
    'max-h-[min(var(--radix-popover-content-available-height),calc(100dvh-var(--spacing-screen-border)*2))]',
    constrainInline && 'max-w-(--radix-popover-content-available-width)',
    ...etc,
  );

export const popoverArrow: ComponentFunction<PopoverStyleProps> = (_props, ...etc) => mx('fill-separator', ...etc);

export const popoverTheme: Theme<PopoverStyleProps> = {
  content: popoverContent,
  viewport: popoverViewport,
  arrow: popoverArrow,
};
