//
// Copyright 2023 DXOS.org
//

import type { ComponentFunction, Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';

export type StatusStyleProps = {
  indeterminate?: boolean;
};

// TODO(burdon): How to customize color without requiring multiple classes.
export const statusRoot: ComponentFunction<StatusStyleProps> = (_props, ...etc) =>
  mx('relative block bs-1 overflow-hidden rounded-full bg-primary-400/20', ...etc);

export const statusBar: ComponentFunction<StatusStyleProps> = ({ indeterminate }, ...etc) =>
  mx(
    'absolute block inline-start-0 inset-block-0 rounded-full bg-primary-400',
    indeterminate && 'animate-progress-indeterminate',
    ...etc,
  );

export const statusTheme: Theme<StatusStyleProps> = {
  root: statusRoot,
  bar: statusBar,
};
