//
// Copyright 2023 DXOS.org
//

import { Brain, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const GPT_PLUGIN = 'dxos.org/plugin/gpt';

export default pluginMeta({
  id: GPT_PLUGIN,
  name: 'GPT',
  description: 'Train GPT models on your data.',
  tags: ['experimental'],
  iconComponent: (props: IconProps) => <Brain {...props} />,
});
