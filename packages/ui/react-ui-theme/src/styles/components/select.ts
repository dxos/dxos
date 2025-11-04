//
// Copyright 2022 DXOS.org
//

import { type ComponentFunction, type Elevation, type Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';
import {
  blockSeparator,
  ghostHighlighted,
  modalSurface,
  separatorBorderColor,
  surfaceShadow,
  surfaceZIndex,
} from '../fragments';

export type SelectStyleProps = Partial<{
  elevation: Elevation;
}>;

export const selectContent: ComponentFunction<SelectStyleProps> = ({ elevation }, ...etc) =>
  mx(
    'min-w-[--radix-select-trigger-width] rounded max-bs-[--radix-select-content-available-height] border border-separator',
    modalSurface,
    surfaceShadow({ elevation: 'positioned' }),
    surfaceZIndex({ elevation, level: 'menu' }),
    ...etc,
  );

export const selectViewport: ComponentFunction<SelectStyleProps> = (_props, ...etc) => mx(...etc);

export const selectItem: ComponentFunction<SelectStyleProps> = (_props, ...etc) =>
  mx(
    'flex items-center min-bs-[2rem] pli-3 plb-1 gap-2',
    'text-baseText leading-none select-none outline-none',
    '[&>svg]:invisible [&[data-state=checked]>svg]:visible',
    ghostHighlighted,
    ...etc,
  );

export const selectItemIndicator: ComponentFunction<SelectStyleProps> = (_props, ...etc) => mx('items-center', ...etc);

export const selectArrow: ComponentFunction<SelectStyleProps> = (_props, ...etc) => mx('fill-separator', ...etc);

export const selectSeparator: ComponentFunction<SelectStyleProps> = (_props, ...etc) =>
  mx(blockSeparator, separatorBorderColor, ...etc);

export const selectScrollButton: ComponentFunction<SelectStyleProps> = (_props, ...etc) =>
  mx(modalSurface, 'flex items-center justify-center cursor-default bs-6 is-full', ...etc);

export const selectTheme: Theme<SelectStyleProps> = {
  content: selectContent,
  viewport: selectViewport,
  item: selectItem,
  itemIndicator: selectItemIndicator,
  arrow: selectArrow,
  separator: selectSeparator,
  scrollButton: selectScrollButton,
};
