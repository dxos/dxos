//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.lighthouse',
    name: 'Lighthouse',
    author: 'DXOS',
    description: trim`
      Agent-driven web research. A Research hands a goal to a lighthouse search session, streams its thread
      beside a ranked masonry of what it found, and keeps the picks and starred results in the space.
    `,
    icon: { key: 'ph--binoculars--regular', hue: 'amber' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-lighthouse',
    spec: 'PLUGIN.mdl',
    tags: ['labs', 'connector'],
  },
});
