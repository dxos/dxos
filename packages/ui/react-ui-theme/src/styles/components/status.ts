//
// Copyright 2023 DXOS.org
//

import type { ComponentFunction, Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';

export type StatusStyleProps = {
  indeterminate?: boolean;
};

export const statusRoot: ComponentFunction<StatusStyleProps> = (_props, ...etc) =>
  mx('is-20 bs-1 inline-block relative bg-neutral-400/25 rounded-full', ...etc);

export const statusBar: ComponentFunction<StatusStyleProps> = ({ indeterminate }, ...etc) =>
  mx(
    'absolute inline-start-0 inset-block-0 inline-block bg-neutral-400 rounded-full',
    indeterminate && 'animate-progress-indeterminate',
    ...etc,
  );

export const statusTheme: Theme<StatusStyleProps> = {
  root: statusRoot,
  bar: statusBar,
};
