//
// Copyright 2023 DXOS.org
//

import { Function, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const FUNCTION_PLUGIN = 'dxos.org/plugin/function';

export default pluginMeta({
  id: FUNCTION_PLUGIN,
  name: 'Function',
  description: 'Distributed functions.',
  tags: ['experimental'],
  iconComponent: (props: IconProps) => <Function {...props} />,
});
