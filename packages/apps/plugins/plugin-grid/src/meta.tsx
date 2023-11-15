//
// Copyright 2023 DXOS.org
//

import { SquaresFour } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const GRID_PLUGIN = 'dxos.org/plugin/grid';

export default pluginMeta({
  id: GRID_PLUGIN,
  name: 'Grids',
  iconComponent: (props) => <SquaresFour {...props} />,
});
