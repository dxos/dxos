//
// Copyright 2024 DXOS.org
//

import { Info, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const STATUS_BAR_PLUGIN = 'dxos.org/plugin/status-bar';

export default pluginMeta({
  id: STATUS_BAR_PLUGIN,
  name: 'Status Bar',
  description: 'Display a bar with status and actions.',
  iconComponent: (props: IconProps) => <Info {...props} />,
});
