//
// Copyright 2023 DXOS.org
//

import { Check } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

// TODO(burdon): Generalize to lists (optional checkbox)?
export const TASKS_PLUGIN = 'dxos.org/plugin/tasks';

export default pluginMeta({
  id: TASKS_PLUGIN,
  name: 'Tasks',
  iconComponent: (props) => <Check {...props} />,
});
