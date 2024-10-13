//
// Copyright 2022 DXOS.org
//

import { type ComponentFunction, type Elevation, type Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';
import {
  arrow,
  blockSeparator,
  getSize,
  ghostHighlighted,
  modalSurface,
  surfaceElevation,
  separatorBorderColor,
} from '../fragments';

export type SelectStyleProps = Partial<{
  elevation: Elevation;
}>;

export const selectContent: ComponentFunction<SelectStyleProps> = ({ elevation = 'chrome' }, ...etc) => {
  return mx(
    'z-[50] min-w-[--radix-select-trigger-width] rounded',
    modalSurface,
    surfaceElevation({ elevation }),
    ...etc,
  );
};

export const selectItem: ComponentFunction<SelectStyleProps> = (_props, ...etc) =>
  mx(
    'flex items-center min-bs-[2rem] pli-3 plb-1',
    'text-baseText leading-none rounded-sm select-none outline-none',
    '[data-state="checked"]:text-red-300',
    ghostHighlighted,
    ...etc,
  );

export const selectItemIndicator: ComponentFunction<SelectStyleProps> = (_props, ...etc) => mx('items-center', ...etc);

export const selectArrow: ComponentFunction<SelectStyleProps> = (_props, ...etc) => mx(arrow, ...etc);

export const selectSeparator: ComponentFunction<SelectStyleProps> = (_props, ...etc) =>
  mx(blockSeparator, separatorBorderColor, ...etc);

export const selectScrollButton: ComponentFunction<SelectStyleProps> = (_props, ...etc) =>
  mx(modalSurface, 'flex items-center justify-center cursor-default bs-6 is-full', ...etc);

export const selectTriggerIcon: ComponentFunction<SelectStyleProps> = (_props, ...etc) => mx(getSize(2), ...etc);

export const selectTheme: Theme<SelectStyleProps> = {
  content: selectContent,
  item: selectItem,
  itemIndicator: selectItemIndicator,
  arrow: selectArrow,
  separator: selectSeparator,
  scrollButton: selectScrollButton,
  triggerIcon: selectTriggerIcon,
};
