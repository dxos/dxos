//
// Copyright 2023 DXOS.org
//

import { Bug } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const DEBUG_PLUGIN = 'dxos.org/plugin/debug';

export default pluginMeta({
  id: DEBUG_PLUGIN,
  name: 'Debug',
  iconComponent: (props) => <Bug {...props} />,
});
