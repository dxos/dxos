//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/react-ui-types';

export type IconStyleProps = {};

export const iconRoot: ComponentFunction<IconStyleProps> = () => '';

export const iconTheme: Theme<IconStyleProps> = {
  root: iconRoot,
};
