//
// Copyright 2022 DXOS.org
//

import { type ComponentFunction, type Elevation, type Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { arrow, blockSeparator, chromeSurface, surfaceElevation } from '../fragments';

export type SelectStyleProps = Partial<{
  elevation: Elevation;
}>;

export const selectContent: ComponentFunction<SelectStyleProps> = ({ elevation = 'chrome' }, ...etc) => {
  return mx('p-1 z-[50] rounded', chromeSurface, surfaceElevation({ elevation }), ...etc);
};

export const selectItem: ComponentFunction<SelectStyleProps> = (_props, ...etc) =>
  mx(
    'relative flex items-center pis-6 pie-3 plb-1',
    'text-base leading-none rounded-sm select-none outline-none',
    'data-[highlighted]:bg-primary-500 dark:data-[highlighted]:bg-primary-500 data-[highlighted]:text-primary-100',
    ...etc,
  );

export const selectItemIndicator: ComponentFunction<SelectStyleProps> = (_props, ...etc) =>
  mx('absolute inline-start-0 is-6 inline-flex items-center justify-center', ...etc);

export const selectArrow: ComponentFunction<SelectStyleProps> = (_props, ...etc) => mx(arrow, ...etc);

export const selectSeparator: ComponentFunction<SelectStyleProps> = (_props, ...etc) => mx(blockSeparator, ...etc);

export const selectScrollButton: ComponentFunction<SelectStyleProps> = (_props, ...etc) =>
  mx(chromeSurface, 'flex items-center justify-center cursor-default bs-6 is-full', ...etc);

export const selectTheme: Theme<SelectStyleProps> = {
  content: selectContent,
  item: selectItem,
  itemIndicator: selectItemIndicator,
  arrow: selectArrow,
  separator: selectSeparator,
  scrollButton: selectScrollButton,
};
