//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Size, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';
import { getSize } from '../fragments';

export type IconStyleProps = {
  size?: Size;
};

export const iconRoot: ComponentFunction<IconStyleProps> = ({ size }, etc) =>
  mx('shrink-0 bs-[1em] is-[1em] text-[var(--icons-color,currentColor)]', size && getSize(size), etc);

export const iconTheme: Theme<IconStyleProps> = {
  root: iconRoot,
};
