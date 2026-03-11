//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Size, type Theme } from '@dxos/ui-types';

import { getSize } from '../../fragments';
import { mx } from '../../util';

export type IconStyleProps = {
  size?: Size;
};

export const iconRoot: ComponentFunction<IconStyleProps> = ({ size }, etc) =>
  mx('shrink-0 h-[1em] w-[1em] text-[var(--icons-color,currentColor)]', size && getSize(size), etc);

export const iconTheme: Theme<IconStyleProps> = {
  root: iconRoot,
};
