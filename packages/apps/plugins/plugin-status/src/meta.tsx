//
// Copyright 2023 DXOS.org
//

import { Compass, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const STATUS_PLUGIN = 'dxos.org/plugin/status';

export default pluginMeta({
  id: STATUS_PLUGIN,
  name: 'Status',
  description: 'Display a bar with status and actions.',
  tags: ['experimental'],
  iconComponent: (props: IconProps) => <Compass {...props} />,
});
