//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';
import { focusRing, surfaceElevation, popperMotion, groupSurface, groupArrow } from '../fragments';

export type PopoverStyleProps = Partial<{
  constrainInline?: boolean;
  constrainBlock: boolean;
}>;

export const popoverViewport: ComponentFunction<PopoverStyleProps> = ({ constrainInline, constrainBlock }, ...etc) =>
  mx(
    'p-1 rounded-xl',
    constrainInline && 'max-is-[--radix-popover-content-available-width] overflow-x-auto',
    constrainBlock && 'max-bs-[--radix-popover-content-available-height] overflow-y-auto',
    ...etc,
  );

export const popoverContent: ComponentFunction<PopoverStyleProps> = (_props, ...etc) =>
  mx('z-[30] rounded-xl', popperMotion, groupSurface, surfaceElevation({ elevation: 'group' }), focusRing, ...etc);

export const popoverArrow: ComponentFunction<PopoverStyleProps> = (_props, ...etc) => mx(groupArrow, ...etc);

export const popoverTheme: Theme<PopoverStyleProps> = {
  content: popoverContent,
  viewport: popoverViewport,
  arrow: popoverArrow,
};
