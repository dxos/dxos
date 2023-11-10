//
// Copyright 2023 DXOS.org
//

import { Code } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const SCRIPT_PLUGIN = 'dxos.org/plugin/script';

export default pluginMeta({
  id: SCRIPT_PLUGIN,
  name: 'Scripts',
  iconComponent: (props) => <Code {...props} />,
});
