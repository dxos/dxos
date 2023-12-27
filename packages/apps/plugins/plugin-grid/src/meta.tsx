//
// Copyright 2023 DXOS.org
//

import { SquaresFour, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const GRID_PLUGIN = 'dxos.org/plugin/grid';

export default pluginMeta({
  id: GRID_PLUGIN,
  name: 'Grid',
  iconComponent: (props: IconProps) => <SquaresFour {...props} />,
});
