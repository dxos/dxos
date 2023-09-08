//
// Copyright 2022 DXOS.org
//

import { ComponentFunction, Elevation, Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { chromeSurface, surfaceElevation } from '../fragments';

export type SelectorStyleProps = Partial<{
  elevation: Elevation;
}>;

export const selectorRoot: ComponentFunction<SelectorStyleProps> = (_props, ...etc) => {
  return mx('w-full', ...etc);
};

export const selectorInput: ComponentFunction<SelectorStyleProps> = (_props, ...etc) => {
  return mx('px-2', ...etc);
};

export const selectorButton: ComponentFunction<SelectorStyleProps> = (_props, ...etc) => {
  return mx('', ...etc);
};

export const selectorContent: ComponentFunction<SelectorStyleProps> = ({ elevation }, ...etc) => {
  return mx(
    'z-[50]',
    // TODO(burdon): Should be -selector-.
    'w-[--radix-popper-anchor-width]',
    // TODO(burdon): Height constraint isn't working.
    'max-h-[--radix-popper-available-height] overflow-y-auto',
    chromeSurface,
    surfaceElevation({ elevation }),
    ...etc,
  );
};

export const selectorItem: ComponentFunction<SelectorStyleProps> = (_props, ...etc) => {
  return mx(
    'flex shrink-0 items-center px-2 py-2',
    // TODO(burdon): Truncate doesn't work.
    'text-base leading-none select-none cursor-pointer truncate',
    'data-[selected]:bg-primary-500 dark:data-[selected]:bg-primary-500 data-[selected]:text-primary-100',
    // TODO(burdon): Factor out highlight.
    'data-[highlighted]:bg-neutral-75 dark:data-[highlighted]:bg-neutral-850',
    ...etc,
  );
};

export const selectorTheme: Theme<SelectorStyleProps> = {
  root: selectorRoot,
  input: selectorInput,
  button: selectorButton,
  content: selectorContent,
  item: selectorItem,
};
