//
// Copyright 2023 DXOS.org
//

import { Brain, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const CHAIN_PLUGIN = 'dxos.org/plugin/chain';

export default pluginMeta({
  id: CHAIN_PLUGIN,
  name: 'Chain',
  description: 'AI prompt configuration.',
  tags: ['experimental'],
  iconComponent: (props: IconProps) => <Brain {...props} />,
});
