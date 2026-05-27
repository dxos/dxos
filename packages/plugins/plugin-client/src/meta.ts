//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';
import { DXN } from '@dxos/keys';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.client'),
  name: 'Client',
  author: 'DXOS',
  description: trim`
    Core client connectivity and peer-to-peer networking infrastructure.
    Manages identity, authentication, and real-time synchronization across devices.
  `,
  tags: ['system'],
};
