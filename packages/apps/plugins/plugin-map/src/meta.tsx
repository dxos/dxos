//
// Copyright 2023 DXOS.org
//

import { Compass } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const MAP_PLUGIN = 'dxos.org/plugin/map';

export default pluginMeta({
  id: MAP_PLUGIN,
  name: 'Maps',
  iconComponent: (props) => <Compass {...props} />,
});
