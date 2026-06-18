//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.client',
    name: 'Client',
    description: trim`
      Core client connectivity and peer-to-peer networking infrastructure.
      Manages identity, authentication, and real-time synchronization across devices.
    `,
    tags: ['system'],
  },
});
