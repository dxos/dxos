//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { focusRing } from '../fragments';

export type LinkStyleProps = {};

export const linkRoot: ComponentFunction<LinkStyleProps> = (_props, ...etc) =>
  mx(
    'underline decoration-1 underline-offset-2 transition-color rounded-sm',
    'text-primary-600 hover:text-primary-500 dark:text-primary-300 hover:dark:text-primary-200',
    'visited:text-teal-600 visited:hover:text-teal-500 visited:dark:text-teal-300 visited:hover:dark:text-teal-200',
    focusRing,
    ...etc,
  );

export const linkTheme: Theme<LinkStyleProps> = {
  root: linkRoot,
};
