//
// Copyright 2023 DXOS.org
//

import { ComponentFunction, Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { arrow, chromeSurface, dataDisabled, descriptionText, subduedFocus, surfaceElevation } from '../fragments';

export type DropdownMenuStyleProps = {};

export const dropdownMenuContent: ComponentFunction<DropdownMenuStyleProps> = (_props, ...etc) =>
  mx(
    'radix-side-top:animate-slide-up radix-side-bottom:animate-slide-down',
    'is-48 rounded-md p-1 md:is-56',
    chromeSurface,
    surfaceElevation({ elevation: 'group' }),
    ...etc,
  );

export const dropdownMenuItem: ComponentFunction<DropdownMenuStyleProps> = (_props, ...etc) =>
  mx(
    'flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 text-sm',
    'text-neutral-900 data-[highlighted]:bg-neutral-50 dark:text-neutral-100 dark:data-[highlighted]:bg-neutral-900',
    subduedFocus,
    dataDisabled,
    ...etc,
  );

export const dropdownMenuSeparator: ComponentFunction<DropdownMenuStyleProps> = (_props, ...etc) =>
  mx('mlb-1 mli-2 bs-px bg-neutral-200 dark:bg-neutral-700', ...etc);

export const dropdownMenuGroupLabel: ComponentFunction<DropdownMenuStyleProps> = (_props, ...etc) =>
  mx(descriptionText, 'select-none pli-2 plb-2', ...etc);

export const dropdownMenuArrow: ComponentFunction<DropdownMenuStyleProps> = (_props, ...etc) => mx(arrow, ...etc);

export const dropdownMenuTheme: Theme<DropdownMenuStyleProps> = {
  content: dropdownMenuContent,
  item: dropdownMenuItem,
  separator: dropdownMenuSeparator,
  groupLabel: dropdownMenuGroupLabel,
  arrow: dropdownMenuArrow,
};
