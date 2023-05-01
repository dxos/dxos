//
// Copyright 2023 DXOS.org
//

import { ComponentFunction, Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { dataDisabled, subduedFocus } from '../fragments';

export type DropdownMenuStyleProps = {};

export const dropdownMenuItem: ComponentFunction<DropdownMenuStyleProps> = (_styleProps, ...etc) =>
  mx(
    'flex cursor-pointer select-none items-center rounded-md px-2 py-2 text-sm',
    'text-neutral-900 data-[highlighted]:bg-neutral-50 dark:text-neutral-100 dark:data-[highlighted]:bg-neutral-900',
    subduedFocus,
    dataDisabled,
    ...etc
  );

export const dropdownMenuTheme: Theme<DropdownMenuStyleProps> = { item: dropdownMenuItem };
