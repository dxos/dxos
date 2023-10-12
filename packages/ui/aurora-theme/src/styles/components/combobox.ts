//
// Copyright 2022 DXOS.org
//

import { type ComponentFunction, type Elevation, type Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { chromeSurface, inputSurface, surfaceElevation } from '../fragments';

export type comboboxStyleProps = Partial<{
  elevation: Elevation;
}>;

export const comboboxRoot: ComponentFunction<comboboxStyleProps> = (_props, ...etc) => {
  return mx('w-full', inputSurface, ...etc);
};

export const comboboxInput: ComponentFunction<comboboxStyleProps> = (_props, ...etc) => {
  return mx('px-2', ...etc);
};

export const comboboxButton: ComponentFunction<comboboxStyleProps> = (_props, ...etc) => {
  return mx('', ...etc);
};

export const comboboxContent: ComponentFunction<comboboxStyleProps> = ({ elevation }, ...etc) => {
  return mx(
    'z-[50] overview-hidden overflow-y-auto',
    'w-[--radix-combobox-trigger-width]',
    // TODO(burdon): This is the display height (make shorter?) Also scroll up if bottom of screen?
    'max-h-[--radix-combobox-content-available-height]',
    chromeSurface,
    surfaceElevation({ elevation }),
    ...etc,
  );
};

export const comboboxItem: ComponentFunction<comboboxStyleProps> = (_props, ...etc) => {
  return mx(
    'block px-2 py-2 truncate',
    'text-base leading-none select-none cursor-pointer',
    // TODO(burdon): Factor out select and highlight.
    'data-[selected]:bg-primary-500 dark:data-[selected]:bg-primary-500 data-[selected]:text-primary-100',
    'data-[highlighted]:bg-primary-500 dark:data-[highlighted]:bg-primary-500 data-[highlighted]:text-primary-100',
    ...etc,
  );
};

export const comboboxTheme: Theme<comboboxStyleProps> = {
  root: comboboxRoot,
  input: comboboxInput,
  button: comboboxButton,
  content: comboboxContent,
  item: comboboxItem,
};
