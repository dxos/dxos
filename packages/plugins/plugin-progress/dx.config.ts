//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.progress',
    name: 'Progress',
    author: 'DXOS',
    description: trim`
      Hosts the progress-monitor capability: a registry of live progress providers exposed as
      reactive atoms, plus an R0 status-indicator popover that lists all active providers.
    `,
    tags: ['system'],
  },
});
