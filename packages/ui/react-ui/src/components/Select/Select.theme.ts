//
// Copyright 2022 DXOS.org
//

import { mx, surfaceShadow, surfaceZIndex } from '@dxos/ui-theme';
import { type ComponentFunction, type Elevation, type Theme } from '@dxos/ui-types';

export type SelectStyleProps = Partial<{
  elevation: Elevation;
}>;

const content: ComponentFunction<SelectStyleProps> = ({ elevation }, ...etc) => {
  return mx(
    'dx-modal-surface rounded-sm border border-separator',
    'min-w-(--radix-select-trigger-width) max-h-(--radix-select-content-available-height)',
    surfaceShadow({ elevation: 'positioned' }),
    surfaceZIndex({ elevation, level: 'menu' }),
    ...etc,
  );
};

const triggerButton: ComponentFunction<SelectStyleProps> = (_props, ...etc) =>
  mx('grid grid-cols-[1fr_auto] [&>span]:text-left', ...etc);

const viewport: ComponentFunction<SelectStyleProps> = (_props, ...etc) => mx(...etc);

const item: ComponentFunction<SelectStyleProps> = (_props, ...etc) =>
  mx(
    'flex items-center min-h-[2rem] px-2.5 py-1 gap-2',
    'text-base-fg leading-none select-none outline-hidden',
    '[&>svg]:invisible [&[data-state=checked]>svg]:visible',
    'dx-highlighted',
    ...etc,
  );

const itemIndicator: ComponentFunction<SelectStyleProps> = (_props, ...etc) => mx('items-center', ...etc);

const arrow: ComponentFunction<SelectStyleProps> = (_props, ...etc) => mx('fill-separator', ...etc);

const separator: ComponentFunction<SelectStyleProps> = (_props, ...etc) =>
  mx('self-stretch border-b my-1 border-separator', ...etc);

const scrollButton: ComponentFunction<SelectStyleProps> = (_props, ...etc) =>
  mx('dx-modal-surface flex items-center justify-center cursor-default h-6 w-full', ...etc);

export const selectTheme: Theme<SelectStyleProps> = {
  content,
  triggerButton,
  viewport,
  item,
  itemIndicator,
  arrow,
  separator,
  scrollButton,
};
