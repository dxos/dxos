//
// Copyright 2023 DXOS.org
//

import type { ComponentFunction, Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';

export type StatusStyleProps = {
  indeterminate?: boolean;
};

export const statusRoot: ComponentFunction<StatusStyleProps> = (_props, ...etc) =>
  mx('bs-1 block relative bg-orange-400/25 rounded-full overflow-hidden block', ...etc, 'block');

export const statusBar: ComponentFunction<StatusStyleProps> = ({ indeterminate }, ...etc) =>
  mx(
    'absolute block inline-start-0 inset-block-0 bg-orange-400 rounded-full block',
    indeterminate && 'animate-progress-indeterminate',
    ...etc,
    'block',
  );

export const statusTheme: Theme<StatusStyleProps> = {
  root: statusRoot,
  bar: statusBar,
};
