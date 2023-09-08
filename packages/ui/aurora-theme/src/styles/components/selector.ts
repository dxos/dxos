//
// Copyright 2022 DXOS.org
//

import { ComponentFunction, Elevation, Theme } from '@dxos/aurora-types';

import { mx } from '../../util';

export type SelectorStyleProps = Partial<{
  elevation: Elevation;
}>;

export const selectorRoot: ComponentFunction<SelectorStyleProps> = (_props, ...etc) => {
  return mx('flex flex-col w-full', ...etc);
};

export const selectorContent: ComponentFunction<SelectorStyleProps> = (_props, ...etc) => {
  return mx('relative overflow-y-scroll max-h-[288px]', ...etc);
};

export const selectorItem: ComponentFunction<SelectorStyleProps> = (_props, ...etc) => {
  return mx(
    'flex items-center px-2 py-2',
    'text-base leading-none select-none cursor-pointer truncate',
    'data-[selected]:bg-primary-500 dark:data-[selected]:bg-primary-500 data-[selected]:text-primary-100',
    // TODO(burdon): Factor out highlight.
    'data-[highlighted]:bg-neutral-75 dark:data-[highlighted]:bg-neutral-850',
    ...etc,
  );
};

export const selectorTheme: Theme<SelectorStyleProps> = {
  root: selectorRoot,
  content: selectorContent,
  item: selectorItem,
};
