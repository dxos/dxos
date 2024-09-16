//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Size, type Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';
import { getSize } from '../fragments';

export type IconStyleProps = {
  size?: Size;
};

export const iconRoot: ComponentFunction<IconStyleProps> = ({ size }, etc) => mx(size && getSize(size), etc);

export const iconTheme: Theme<IconStyleProps> = {
  root: iconRoot,
};
