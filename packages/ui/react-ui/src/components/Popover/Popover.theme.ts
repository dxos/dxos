//
// Copyright 2023 DXOS.org
//

import { mx, surfaceShadow, surfaceZIndex } from '@dxos/ui-theme';
import { type ComponentFunction, type Elevation, type Theme } from '@dxos/ui-types';

export type PopoverStyleProps = Partial<{
  constrainBlock: boolean;
  constrainInline: boolean;
  elevation: Elevation;
}>;

const content: ComponentFunction<PopoverStyleProps> = ({ elevation }, ...etc) =>
  mx(
    'dx-popover-surface overflow-hidden border-2 border-separator rounded-sm',
    surfaceShadow({ elevation: 'positioned' }),
    surfaceZIndex({ elevation, level: 'menu' }),
    'dx-focus-ring',
    ...etc,
  );

const viewport: ComponentFunction<PopoverStyleProps> = ({ constrainBlock, constrainInline }, ...etc) =>
  mx(
    'grid grid-rows-[1fr] min-h-0 min-w-popover-min-width',
    (constrainBlock || constrainInline) && 'overflow-hidden',
    constrainBlock && 'max-h-(--radix-popover-content-available-height)',
    constrainBlock &&
      'max-h-[min(var(--radix-popover-content-available-height),calc(100dvh-var(--spacing-screen-border)*2))]',
    constrainInline && 'max-w-(--radix-popover-content-available-width)',
    ...etc,
  );

const arrow: ComponentFunction<PopoverStyleProps> = (_props, ...etc) => mx('fill-separator', ...etc);

export const popoverTheme: Theme<PopoverStyleProps> = {
  content,
  viewport,
  arrow,
};
