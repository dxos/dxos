//
// Copyright 2024 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.welcome'),
  name: 'Welcome',
  author: 'DXOS',
  tags: ['system'],
};
