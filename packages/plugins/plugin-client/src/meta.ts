//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/client',
  name: 'Client',
  description: trim`
    Core client connectivity and peer-to-peer networking infrastructure.
    Manages identity, authentication, and real-time synchronization across devices.
  `,
};
