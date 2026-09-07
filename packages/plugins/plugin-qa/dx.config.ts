//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.qa',
    name: 'QA',
    author: 'DXOS',
    description: trim`
      A store for QA results. A test plan declares a set of cases; every execution appends a run to
      the plan's feed, carrying one result per case together with the documents, screenshots and
      recordings that evidence it.

      Plans are authored and results are pushed over the DXOS MCP surface, so the plan a human
      reads in Composer is the one an agent reports against.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-qa',
    icon: { key: 'ph--check-square-offset--regular', hue: 'green' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
});
