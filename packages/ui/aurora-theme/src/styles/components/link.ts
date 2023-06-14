//
// Copyright 2023 DXOS.org
//

import { ComponentFunction, Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { defaultFocus } from '../fragments';

export type LinkStyleProps = {};

export const linkRoot: ComponentFunction<LinkStyleProps> = (_props, ...etc) =>
  mx(
    'underline decoration-1 underline-offset-2 transition-color rounded-sm',
    'text-primary-600 hover:text-primary-500 dark:text-primary-400 hover:dark:text-primary-300',
    'visited:text-teal-600 visited:hover:text-teal-500 visited:dark:text-teal-400 visited:hover:dark:text-teal-300',
    defaultFocus,
    ...etc,
  );

export const linkTheme: Theme<LinkStyleProps> = {
  root: linkRoot,
};
