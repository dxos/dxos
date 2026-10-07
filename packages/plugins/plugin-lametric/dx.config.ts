//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.laMetric',
    name: 'LaMetric',
    author: 'DXOS',
    description: 'Show a space on a LaMetric TIME — progress while a task runs, statistics otherwise.',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-lametric',
    icon: { key: 'ph--squares-four--regular', hue: 'amber' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
});
