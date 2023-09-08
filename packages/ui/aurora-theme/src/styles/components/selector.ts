//
// Copyright 2022 DXOS.org
//

import { ComponentFunction, Elevation, Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { chromeSurface, surfaceElevation } from '../fragments';

export type SelectorStyleProps = Partial<{
  elevation: Elevation;
}>;

export const selectorContent: ComponentFunction<SelectorStyleProps> = ({ elevation = 'chrome' }, ...etc) => {
  return mx('p-1 z-[50] rounded', chromeSurface, surfaceElevation({ elevation }), ...etc);
};

export const selectorItem: ComponentFunction<SelectorStyleProps> = (_props, ...etc) => {
  console.log('::::', _props);
  return mx(
    'text-base leading-none rounded-sm flex items-center pis-6 pie-3 plb-1 relative select-none outline-none',
    'data-[highlighted]:bg-primary-500 dark:data-[highlighted]:bg-primary-500 data-[highlighted]:text-primary-100',
    ...etc,
  );
};

// highlightedIndex === index && 'bg-neutral-50',
// selectedItem === value && 'bg-neutral-100',
// 'px-2 py-1',

export const selectorTheme: Theme<SelectorStyleProps> = {
  content: selectorContent,
  item: selectorItem,
};
