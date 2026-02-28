//
// Copyright 2022 DXOS.org
//

import { type ComponentFunction, type Elevation, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';
import { blockSeparator, ghostHighlighted, separatorBorderColor, surfaceShadow, surfaceZIndex } from '../fragments';

export type SelectStyleProps = Partial<{
  elevation: Elevation;
}>;

export const selectContent: ComponentFunction<SelectStyleProps> = ({ elevation }, ...etc) => {
  return mx(
    'dx-modal-surface min-w-(--radix-select-trigger-width) rounded-sm max-h-(--radix-select-content-available-height) border border-separator',
    surfaceShadow({ elevation: 'positioned' }),
    surfaceZIndex({ elevation, level: 'menu' }),
    ...etc,
  );
};

export const selectViewport: ComponentFunction<SelectStyleProps> = (_props, ...etc) => mx(...etc);

export const selectItem: ComponentFunction<SelectStyleProps> = (_props, ...etc) =>
  mx(
    'flex items-center min-h-[2rem] px-3 py-1 gap-2',
    'text-base-surface-text leading-none select-none outline-hidden',
    '[&>svg]:invisible [&[data-state=checked]>svg]:visible',
    ghostHighlighted,
    ...etc,
  );

export const selectItemIndicator: ComponentFunction<SelectStyleProps> = (_props, ...etc) => mx('items-center', ...etc);

export const selectArrow: ComponentFunction<SelectStyleProps> = (_props, ...etc) => mx('fill-separator', ...etc);

export const selectSeparator: ComponentFunction<SelectStyleProps> = (_props, ...etc) =>
  mx(blockSeparator, separatorBorderColor, ...etc);

export const selectScrollButton: ComponentFunction<SelectStyleProps> = (_props, ...etc) =>
  mx('dx-modal-surface flex items-center justify-center cursor-default h-6 w-full', ...etc);

export const selectTheme: Theme<SelectStyleProps> = {
  content: selectContent,
  viewport: selectViewport,
  item: selectItem,
  itemIndicator: selectItemIndicator,
  arrow: selectArrow,
  separator: selectSeparator,
  scrollButton: selectScrollButton,
};
