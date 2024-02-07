//
// Copyright 2023 DXOS.org
//

import { Compass, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const MAP_PLUGIN = 'dxos.org/plugin/map';

export default pluginMeta({
  id: MAP_PLUGIN,
  name: 'Maps',
  description: 'Display objects on maps.',
  tags: ['experimental'],
  iconComponent: (props: IconProps) => <Compass {...props} />,
});
