//
// Copyright 2023 DXOS.org
//

import { Calendar, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const EVENTS_PLUGIN = 'dxos.org/plugin/events';

export default pluginMeta({
  id: EVENTS_PLUGIN,
  name: 'Events',
  iconComponent: (props: IconProps) => <Calendar {...props} />,
});
