//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';

export type IconStyleProps = {};

export const iconRoot: ComponentFunction<IconStyleProps> = (_props, etc) => mx(etc);

export const iconTheme: Theme<IconStyleProps> = {
  root: iconRoot,
};
