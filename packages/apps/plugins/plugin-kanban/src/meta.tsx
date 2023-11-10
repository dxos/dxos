//
// Copyright 2023 DXOS.org
//

import { Kanban } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const KANBAN_PLUGIN = 'dxos.org/plugin/kanban';

export default pluginMeta({
  id: KANBAN_PLUGIN,
  name: 'Kanban',
  iconComponent: (props) => <Kanban {...props} />,
});
