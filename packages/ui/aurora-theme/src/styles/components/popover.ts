//
// Copyright 2023 DXOS.org
//

import { ComponentFunction, Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { arrow, chromeSurface, focusRing, surfaceElevation, popperMotion } from '../fragments';

export type PopoverStyleProps = Partial<{
  constrainInline?: boolean;
  constrainBlock: boolean;
}>;

export const popoverViewport: ComponentFunction<PopoverStyleProps> = ({ constrainInline, constrainBlock }, ...etc) =>
  mx(
    'p-1 rounded-md',
    constrainInline && 'max-is-[--radix-popover-content-available-width] overflow-x-auto',
    constrainBlock && 'max-bs-[--radix-popover-content-available-height] overflow-y-auto',
    ...etc,
  );

export const popoverContent: ComponentFunction<PopoverStyleProps> = (_props, ...etc) =>
  mx('rounded-md', popperMotion, chromeSurface, surfaceElevation({ elevation: 'group' }), focusRing, ...etc);

export const popoverArrow: ComponentFunction<PopoverStyleProps> = (_props, ...etc) => mx(arrow, ...etc);

export const popoverTheme: Theme<PopoverStyleProps> = {
  content: popoverContent,
  viewport: popoverViewport,
  arrow: popoverArrow,
};
