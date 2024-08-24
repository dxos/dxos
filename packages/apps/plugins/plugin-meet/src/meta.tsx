//
// Copyright 2023 DXOS.org
//

import { Headset, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const MEET_PLUGIN = 'dxos.org/plugin/meet';

export default pluginMeta({
  id: MEET_PLUGIN,
  name: 'Meet',
  description: 'Meeting room plugin.',
  tags: ['experimental'],
  iconComponent: (props: IconProps) => <Headset {...props} />,
  iconSymbol: 'ph--headset--regular',
});
